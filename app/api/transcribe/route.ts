import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

// Replicate client 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const modelSize = formData.get('modelSize') as string || 'turbo';
    const language = formData.get('language') as string || 'Auto';
    const prompt = formData.get('prompt') as string || '';

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    const dataUri = `data:${audioFile.type};base64,${base64Audio}`;

    // Replicate 모델 실행
    const output = await replicate.run(
      "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
      {
        input: {
          audio: dataUri,
          task: "transcribe",
          language: language === "Auto" ? "None" : language.toLowerCase(),
          timestamp: "chunk",
          batch_size: 24,
          chunk_length: 30,
        }
      }
    );

    // 결과 처리
    const result = output as any;
    
    // 원본 텍스트 추출
    const rawText = result.text || '';
    
    // 세그먼트 처리
    const segments = result.chunks || [];
    
    // SRT 형식으로 변환
    const rawSubtitles = createSrtContent(segments, false);
    const arrangedSubtitles = arrangeSubtitles(rawSubtitles);

    return NextResponse.json({
      success: true,
      rawSubtitles,
      arrangedSubtitles,
      transcription: rawText,
      segments: segments
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: '음성 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// SRT 형식 생성 함수
function createSrtContent(chunks: any[], wordLevel: boolean = false): string {
  let srtLines: string[] = [];
  let index = 1;

  chunks.forEach((chunk: any) => {
    const startTime = formatTimestamp(chunk.timestamp[0]);
    const endTime = formatTimestamp(chunk.timestamp[1]);
    const text = chunk.text.trim();
    
    if (text) {
      srtLines.push(`${index}`);
      srtLines.push(`${startTime} --> ${endTime}`);
      srtLines.push(text);
      srtLines.push('');
      index++;
    }
  });

  return srtLines.join('\n');
}

// 타임스탬프 포맷 함수
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, '0');
}

// 자막 정리 함수
function arrangeSubtitles(srtContent: string): string {
  const blocks = srtContent.trim().split('\n\n');
  const arrangedBlocks: string[] = [];
  
  let currentSentence: string[] = [];
  let currentStartTime: string | null = null;
  let currentEndTime: string = '';
  let index = 1;

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeInfo = lines[1];
      const text = lines.slice(2).join(' ');
      
      const [start, end] = timeInfo.split(' --> ');
      
      if (!currentStartTime) {
        currentStartTime = start;
      }
      currentEndTime = end;
      
      currentSentence.push(text);
      
      // 문장 종료 조건
      if (text.match(/[.!?。！？]$/) || text.endsWith('다.') || text.endsWith('요.') || text.endsWith('까?')) {
        const sentenceText = currentSentence.join(' ');
        arrangedBlocks.push(`${index}`);
        arrangedBlocks.push(`${currentStartTime} --> ${currentEndTime}`);
        arrangedBlocks.push(sentenceText);
        arrangedBlocks.push('');
        
        currentSentence = [];
        currentStartTime = null;
        index++;
      }
    }
  });
  
  // 남은 문장 처리
  if (currentSentence.length > 0 && currentStartTime) {
    const sentenceText = currentSentence.join(' ');
    arrangedBlocks.push(`${index}`);
    arrangedBlocks.push(`${currentStartTime} --> ${currentEndTime}`);
    arrangedBlocks.push(sentenceText);
    arrangedBlocks.push('');
  }
  
  return arrangedBlocks.join('\n');
}

// OPTIONS 메소드 (CORS 프리플라이트 요청 처리)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}