import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const result: any = {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'NOT SET'
    };

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        message: 'Supabase 환경 변수가 설정되지 않았습니다',
        details: {
          '문제': supabaseServiceKey ? 'NEXT_PUBLIC_SUPABASE_URL이 없습니다' : 'SUPABASE_SERVICE_ROLE_KEY가 없습니다',
          '해결방법': '.env.local 파일에 필요한 환경 변수를 추가하고 서버를 재시작하세요',
          '상세정보': result
        }
      }, { status: 500 });
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 버킷 목록 확인
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return NextResponse.json({
        success: false,
        error: 'Cannot access storage',
        details: {
          ...result,
          bucketsError: bucketsError.message
        }
      }, { status: 500 });
    }

    const recordingsBucket = buckets?.find(b => b.name === 'recordings');
    
    // 테스트 파일 업로드 시도
    let testUploadSuccess = false;
    if (recordingsBucket) {
      const testFilePath = `test/test-${Date.now()}.txt`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .createSignedUploadUrl(testFilePath, {
          expiresIn: 60
        });
      
      testUploadSuccess = !!uploadData && !uploadError;
      
      // 테스트 파일 경로 정리 (실제로는 업로드하지 않았으므로 삭제할 필요 없음)
    }

    return NextResponse.json({
      success: true,
      message: 'Storage 설정이 정상입니다!',
      details: {
        '환경변수': {
          'SUPABASE_URL 설정됨': result.hasUrl,
          'SERVICE_KEY 설정됨': result.hasServiceKey
        },
        'Storage 상태': {
          '버킷 총 개수': buckets?.length || 0,
          'recordings 버킷 존재': !!recordingsBucket,
          'Public 설정': recordingsBucket?.public || false,
          'Upload URL 생성 가능': testUploadSuccess
        }
      }
    });

  } catch (error: any) {
    console.error('Storage test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}