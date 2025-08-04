import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function GET(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.',
        details: {
          hasToken: false,
          tokenPrefix: null
        }
      }, { status: 500 });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    const tokenPrefix = token.substring(0, 8) + '...';

    // Replicate client 초기화
    const replicate = new Replicate({
      auth: token,
    });

    console.log('Testing Replicate API connection...');

    // 계정 정보 확인으로 크레딧 상태도 함께 체크
    try {
      // 계정 정보를 가져와서 크레딧 상태 확인
      const response = await fetch('https://api.replicate.com/v1/account', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Replicate API Error:', response.status, errorText);
        
        let errorMessage = 'Replicate API 연결 실패';
        if (response.status === 401) {
          errorMessage = 'API 토큰이 유효하지 않습니다.';
        } else if (response.status === 402) {
          errorMessage = 'Replicate 크레딧이 부족합니다.';
        } else if (response.status === 429) {
          errorMessage = 'API 요청 한도를 초과했습니다.';
        }

        return NextResponse.json({
          success: false,
          error: errorMessage,
          details: {
            hasToken: true,
            tokenPrefix,
            status: response.status,
            statusText: response.statusText,
            responseBody: errorText
          }
        }, { status: response.status });
      }

      const data = await response.json();
      console.log('Account data:', data);
      
      return NextResponse.json({
        success: true,
        message: 'Replicate API 연결 성공!',
        details: {
          hasToken: true,
          tokenPrefix,
          apiWorking: true,
          username: data?.username || 'Unknown',
          type: data?.type || 'Unknown',
          // 크레딧 관련 정보는 응답에 따라 다를 수 있음
          accountInfo: data
        }
      });

    } catch (apiError: any) {
      console.error('Replicate API Test Error:', apiError);
      
      return NextResponse.json({
        success: false,
        error: 'Replicate API 호출 중 오류 발생',
        details: {
          hasToken: true,
          tokenPrefix,
          errorMessage: apiError.message,
          errorType: apiError.constructor.name
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      success: false,
      error: '테스트 중 오류 발생',
      details: {
        errorMessage: error.message,
        errorType: error.constructor.name
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'POST method not supported. Use GET to test Replicate connection.'
  }, { status: 405 });
}