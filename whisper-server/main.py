import os
import tempfile
import asyncio
from typing import Optional
from datetime import timedelta

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import whisper
import stable_whisper
import torch

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 사용 가능한 모델들
AVAILABLE_MODELS = ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3", "turbo"]
loaded_models = {}

def load_model(model_name: str, use_stable_ts: bool = False):
    """Whisper 모델을 로드합니다."""
    key = f"{model_name}_{'stable' if use_stable_ts else 'whisper'}"
    
    if key not in loaded_models:
        print(f"Loading {model_name} model...")
        if use_stable_ts:
            loaded_models[key] = stable_whisper.load_model(model_name)
        else:
            loaded_models[key] = whisper.load_model(model_name)
        print(f"Model {model_name} loaded successfully")
    
    return loaded_models[key]

def format_timestamp(seconds):
    """초 단위 시간을 SRT 형식(HH:MM:SS,mmm)으로 변환"""
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.total_seconds(), 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = int((seconds % 1) * 1000)
    seconds = int(seconds)
    return f"{int(hours):02}:{int(minutes):02}:{seconds:02},{milliseconds:03}"

def create_srt_content(result, word_level=True):
    """Whisper 결과를 SRT 형식으로 변환"""
    srt_lines = []
    i = 1
    
    if word_level and hasattr(result, 'segments'):
        for segment in result['segments']:
            for word_info in segment.get('words', []):
                start_time = format_timestamp(word_info['start'])
                end_time = format_timestamp(word_info['end'])
                text = word_info['word'].strip()
                srt_lines.append(f"{i}\n{start_time} --> {end_time}\n{text}\n")
                i += 1
    else:
        for segment in result['segments']:
            start_time = format_timestamp(segment['start'])
            end_time = format_timestamp(segment['end'])
            text = segment['text'].strip()
            srt_lines.append(f"{i}\n{start_time} --> {end_time}\n{text}\n")
            i += 1
    
    return '\n'.join(srt_lines)

def arrange_subtitles(srt_content: str, remove_repeated: bool = True, merge: bool = True):
    """자막을 정리합니다."""
    lines = srt_content.strip().split('\n\n')
    arranged_lines = []
    
    if merge:
        # 문장 단위로 병합하는 로직
        current_sentence = []
        current_start = None
        
        for block in lines:
            parts = block.strip().split('\n')
            if len(parts) >= 3:
                time_info = parts[1]
                text = ' '.join(parts[2:])
                
                start, end = time_info.split(' --> ')
                
                if current_start is None:
                    current_start = start
                
                current_sentence.append(text)
                
                # 문장 종료 조건
                if any(text.endswith(p) for p in ['.', '!', '?', '다.', '요.', '까?']):
                    sentence_text = ' '.join(current_sentence)
                    if remove_repeated:
                        # 반복 단어 제거
                        words = sentence_text.split()
                        cleaned_words = []
                        for i, word in enumerate(words):
                            if i == 0 or word != words[i-1]:
                                cleaned_words.append(word)
                        sentence_text = ' '.join(cleaned_words)
                    
                    arranged_lines.append(f"{len(arranged_lines) + 1}\n{current_start} --> {end}\n{sentence_text}\n")
                    current_sentence = []
                    current_start = None
    else:
        arranged_lines = lines
    
    return '\n'.join(arranged_lines)

@app.post("/api/whisper/process")
async def process_audio(
    audio: UploadFile = File(...),
    modelSize: str = Form("base"),
    language: str = Form("Auto"),
    stableTs: str = Form("false"),
    removeRepeated: str = Form("true"),
    merge: str = Form("true"),
    prompt: str = Form("")
):
    """오디오 파일을 처리하고 자막을 생성합니다."""
    
    # 파라미터 검증
    if modelSize not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid model size: {modelSize}")
    
    # boolean 파라미터 파싱
    use_stable_ts = stableTs.lower() == "true"
    do_remove_repeated = removeRepeated.lower() == "true"
    do_merge = merge.lower() == "true"
    
    # 임시 파일로 오디오 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
        content = await audio.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # 모델 로드
        model = load_model(modelSize, use_stable_ts)
        
        # Whisper 옵션 설정
        decode_options = {
            "task": "transcribe",
            "language": None if language == "Auto" else language,
            "verbose": False,
            "word_timestamps": True,
            "initial_prompt": prompt if prompt else None
        }
        
        # 음성 변환
        print(f"Transcribing {audio.filename}...")
        if use_stable_ts:
            result = model.transcribe(tmp_file_path, **decode_options)
            raw_srt = result.to_srt_vtt(word_level=True)
        else:
            result = model.transcribe(tmp_file_path, **decode_options)
            raw_srt = create_srt_content(result, word_level=True)
        
        # 자막 정리
        arranged_srt = arrange_subtitles(raw_srt, do_remove_repeated, do_merge)
        
        # 결과 반환
        return JSONResponse(content={
            "success": True,
            "rawSubtitles": raw_srt,
            "arrangedSubtitles": arranged_srt,
            "transcription": result["text"],
            "segments": result.get("segments", [])
        })
        
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)

@app.get("/")
async def root():
    return {"message": "Whisper Server is running"}

@app.get("/models")
async def get_models():
    """사용 가능한 모델 목록을 반환합니다."""
    return {"models": AVAILABLE_MODELS}

@app.post("/api/analyze")
async def analyze_segments(data: dict):
    """슬라이드별 텍스트를 분석합니다. (간단한 키워드 추출)"""
    segments = data.get("segments", [])
    
    if not segments:
        raise HTTPException(status_code=400, detail="No segments provided")
    
    analyzed_slides = []
    
    for segment in segments:
        # 간단한 키워드 추출 (실제로는 더 복잡한 NLP 처리 필요)
        text = segment.get("transcript", "")
        words = text.split()
        
        # 긴 단어들을 키워드로 간주
        keywords = [w for w in set(words) if len(w) > 5][:5]
        
        # 간단한 요약 (첫 100자)
        summary = text[:100] + "..." if len(text) > 100 else text
        
        # 예시 질문 생성
        questions = [
            f"{segment['slideNumber']}번 슬라이드의 핵심 내용은 무엇인가요?",
            f"이 부분에서 설명한 주요 개념을 설명하시오."
        ]
        
        analyzed_slides.append({
            "slideNumber": segment["slideNumber"],
            "startTime": segment["startTime"],
            "transcript": text,
            "summary": summary,
            "keywords": keywords,
            "questions": questions
        })
    
    return JSONResponse(content={
        "success": True,
        "slides": analyzed_slides
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 