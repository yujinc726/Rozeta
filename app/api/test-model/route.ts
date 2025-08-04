import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.'
      }, { status: 500 });
    }

    // Replicate client 초기화
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN!,
    });

    console.log('Testing actual model execution...');

    // 매우 간단한 텍스트 생성 모델로 크레딧 테스트
    try {
      const output = await replicate.run(
        "meta/llama-2-7b-chat:13c3cdee13ee059ab779f0291d29054dab00a47dad8261375654de5540165fb0",
        {
          input: {
            prompt: "Hello",
            max_tokens: 5,
            temperature: 0.1
          }
        }
      );

      console.log('Model test successful:', output);

      return NextResponse.json({
        success: true,
        message: '모델 실행 테스트 성공! 크레딧이 충분합니다.',
        output: output
      });

    } catch (modelError: any) {
      console.error('Model execution error:', modelError);
      
      let errorMessage = '모델 실행 실패';
      let isCreditsIssue = false;
      
      if (modelError?.message?.includes('insufficient credit') || 
          modelError?.message?.includes('credit') || 
          modelError?.message?.includes('billing')) {
        errorMessage = '크레딧이 부족합니다.';
        isCreditsIssue = true;
      } else if (modelError?.message?.includes('rate limit')) {
        errorMessage = 'API 요청 한도 초과';
      } else if (modelError?.message?.includes('authentication')) {
        errorMessage = 'API 토큰 인증 실패';
      } else {
        errorMessage = modelError?.message || '알 수 없는 오류';
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        isCreditsIssue,
        details: {
          errorType: modelError?.constructor?.name,
          errorMessage: modelError?.message,
          errorCode: modelError?.code,
          errorStatus: modelError?.status
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test model error:', error);
    
    return NextResponse.json({
      success: false,
      error: '모델 테스트 중 오류 발생',
      details: {
        errorMessage: error.message,
        errorType: error.constructor.name
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to test model execution'
  });
}