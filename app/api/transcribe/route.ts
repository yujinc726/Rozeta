import { NextRequest, NextResponse } from 'next/server';
import { createSrtContent, arrangeSubtitles, groupWordsIntoPhases } from '@/lib/transcript-utils';
import { settingsDb } from '@/lib/database';

const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

// Helper to introduce delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  if (!RUNPOD_ENDPOINT_ID || !RUNPOD_API_KEY) {
    console.error('RunPod environment variables are not set');
      return NextResponse.json(
      { error: 'RunPod API 키 또는 엔드포인트 ID가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

  try {
    let audio_base64: string;
    let model: string = 'large-v3';
    let language: string = 'Auto';
    let prompt: string = '';
    let stable_ts: boolean = true;
    let remove_repeated: boolean = true;
    let merge: boolean = true;
    let regenerate: boolean = false;

    // Content-Type 확인하여 처리 방식 결정
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON 방식 (URL 전달)
      const json = await request.json();
      const { audio_url, stable_ts: st, remove_repeated: rr, merge: m, prompt: p, regenerate: regen } = json;
      
      console.log('🎤 Whisper API 요청:', {
        regenerate: regen || false,
        prompt: p || '(없음)',
        timestamp: new Date().toISOString()
      });
      
      if (!audio_url) {
        return NextResponse.json({ error: '오디오 URL이 없습니다.' }, { status: 400 });
      }
      
      // URL에서 오디오 파일 다운로드
      const audioResponse = await fetch(audio_url);
      if (!audioResponse.ok) {
        throw new Error('오디오 파일을 다운로드할 수 없습니다.');
      }
      
      const arrayBuffer = await audioResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      audio_base64 = buffer.toString('base64');
      
      // 옵션 설정
      if (st !== undefined) stable_ts = st;
      if (rr !== undefined) remove_repeated = rr;
      if (m !== undefined) merge = m;
      if (p) prompt = p;
      if (regen !== undefined) regenerate = regen;
      
    } else {
      // FormData 방식 (파일 직접 업로드)
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;
      model = formData.get('modelSize') as string || 'large-v3';
      language = formData.get('language') as string || 'Auto';
      prompt = formData.get('prompt') as string || '';

      if (!audioFile) {
        return NextResponse.json({ error: '오디오 파일이 없습니다.' }, { status: 400 });
      }

      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      audio_base64 = buffer.toString('base64');
    }
    
    console.log(`Submitting job to RunPod endpoint: ${RUNPOD_ENDPOINT_ID}`);
    console.log(`📌 Whisper 프롬프트: "${prompt || '(기본값)'}"`);
    
    if (regenerate) {
      console.log('🔄 재생성 요청입니다. 새로운 변환을 시작합니다.');
    }

    // Step 1: Submit the job
    const runResponse = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          audio_base64,
          model: "large-v3", // Specify the model size
          language: language === 'Auto' ? undefined : language,
          word_timestamps: true,
          initial_prompt: prompt || undefined,
          // Whisper 옵션 추가 (향후 RunPod 워커가 지원할 경우를 위해)
          // stable_ts,
          // remove_repeated,
          // merge
        },
      }),
    });

    if (!runResponse.ok) {
      const errorBody = await runResponse.text();
      console.error('RunPod API Error (run):', errorBody);
      throw new Error(`RunPod 작업 제출 실패: ${runResponse.statusText} - ${errorBody}`);
    }

    const runResult = await runResponse.json();
    const jobId = runResult.id;
    console.log(`Job submitted successfully. Job ID: ${jobId}`);

    // Step 2: Poll for the result
    let jobStatus;
    let jobOutput;
    const maxRetries = 100; // ~5 minutes timeout
    let retries = 0;

    do {
      await delay(3000); // 3-second delay between polls
      const statusResponse = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        const errorBody = await statusResponse.text();
        console.error('RunPod API Error (status):', errorBody);
        throw new Error(`RunPod 상태 확인 실패: ${statusResponse.statusText} - ${errorBody}`);
      }
      
      const statusResult = await statusResponse.json();
      jobStatus = statusResult.status;
      jobOutput = statusResult.output;
      
      console.log(`Polling job ${jobId}, status: ${jobStatus}`);
      retries++;
      
      if (jobStatus === 'FAILED' || statusResult.error) {
        throw new Error(`RunPod 작업 실패: ${statusResult.error || '알 수 없는 오류'}`);
      }
      
    } while (jobStatus !== 'COMPLETED' && retries < maxRetries);

    if (jobStatus !== 'COMPLETED') {
      throw new Error('RunPod 작업 시간 초과');
    }

    console.log(`RunPod Job ${jobId} COMPLETED.`);
    
    const result = jobOutput;
    
    // The official worker returns 'segments' with word timestamps inside
    const segments = result.segments || [];
    const rawText = segments.map((s: any) => s.text).join(' ').trim();
    
    // Reformat segments to match the expected structure for createSrtContent
    const wordSegments = (result.word_timestamps || []).map((word: any) => ({
        ...word,
        word: word.word.trim()
    }));
    const isWordLevel = wordSegments.length > 0;
    
    const rawSubtitles = createSrtContent(wordSegments.length > 0 ? wordSegments : segments, isWordLevel);
    
    // 사용자 자막 설정 가져오기
    let maxWords = 12; // 기본값
    
    // JSON 방식(백그라운드 작업)일 때는 사용자 설정을 건너뛰고 기본값 사용
    if (!contentType.includes('application/json')) {
      try {
        const settings = await settingsDb.get();
        if (settings?.subtitles?.max_words) {
          maxWords = settings.subtitles.max_words;
        }
      } catch (error) {
        console.warn('Failed to load subtitle settings, using default:', error);
      }
    }

    // 단어 단위 자막을 적절한 구문 단위로 그룹화
    const phrasedSubtitles = isWordLevel ? groupWordsIntoPhases(rawSubtitles, maxWords) : arrangeSubtitles(rawSubtitles, maxWords);

    return NextResponse.json({
      success: true,
      rawSubtitles,  // 단어 단위 자막 (transcript용)
      arrangedSubtitles: phrasedSubtitles, // 구문 단위 자막 (subtitles용)
      transcription: rawText,
      segments: wordSegments,
    });

  } catch (error: any) {
    console.error('=== TRANSCRIPTION ERROR DETAILS ===');
    console.error('Error message:', error?.message);
    return NextResponse.json(
        { error: `RunPod 처리 중 오류 발생: ${error.message}` }, 
      { status: 500 }
    );
  }
}

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
