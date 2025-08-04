import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return NextResponse.json(
        { 
          error: 'Supabase 설정이 완료되지 않았습니다.',
          details: 'SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다. .env.local 파일을 확인해주세요.'
        },
        { status: 500 }
      );
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { fileName, contentType } = await request.json();
    
    if (!fileName) {
      return NextResponse.json(
        { error: '파일 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    // 고유한 파일 경로 생성 (timestamp 포함)
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `audio_${timestamp}.${fileExtension}`;
    const filePath = `transcribe-temp/${uniqueFileName}`;

    // 먼저 버킷이 존재하는지 확인
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('버킷 목록 조회 오류:', bucketsError);
      return NextResponse.json(
        { 
          error: 'Storage 접근 권한이 없습니다.',
          details: 'Service Role Key가 올바른지 확인해주세요.'
        },
        { status: 500 }
      );
    }

    const recordingsBucket = buckets?.find(b => b.name === 'recordings');
    if (!recordingsBucket) {
      console.error('recordings 버킷을 찾을 수 없습니다.');
      return NextResponse.json(
        { 
          error: 'Storage 버킷이 설정되지 않았습니다.',
          details: "Supabase Dashboard에서 'recordings' 버킷을 생성해주세요."
        },
        { status: 500 }
      );
    }

    // Signed Upload URL 생성 (5분간 유효)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .createSignedUploadUrl(filePath, {
        expiresIn: 300 // 5분
      });

    if (uploadError) {
      console.error('Upload URL 생성 오류:', uploadError);
      return NextResponse.json(
        { 
          error: 'Upload URL 생성에 실패했습니다.',
          details: uploadError.message
        },
        { status: 500 }
      );
    }

    // Public URL 생성 (읽기용)
    const { data: publicUrlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(filePath);

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      filePath,
      expiresIn: 300
    });

  } catch (error: any) {
    console.error('Upload URL API 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}