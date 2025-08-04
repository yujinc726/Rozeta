import { NextRequest, NextResponse } from 'next/server';
import { createSrtContent, arrangeSubtitles, groupWordsIntoPhases } from '@/lib/transcript-utils';

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
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const model = formData.get('modelSize') as string || 'large-v3'; // faster-whisper model
    const language = formData.get('language') as string || 'Auto';
    const prompt = formData.get('prompt') as string || '';

    if (!audioFile) {
      return NextResponse.json({ error: '오디오 파일이 없습니다.' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audio_base64 = buffer.toString('base64');
    
    console.log(`Submitting job to RunPod endpoint: ${RUNPOD_ENDPOINT_ID}`);

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
    
    // 단어 단위 자막을 적절한 구문 단위로 그룹화
    const phrasedSubtitles = isWordLevel ? groupWordsIntoPhases(rawSubtitles, 12) : arrangeSubtitles(rawSubtitles);

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
