import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Cleaning up temporary file:', filePath);

    // Supabase Storage에서 파일 삭제
    const { error } = await supabase.storage
      .from('recordings')
      .remove([filePath]);

    if (error) {
      console.error('파일 삭제 오류:', error);
      // 파일이 없는 경우도 성공으로 처리
      if (error.message.includes('Object not found')) {
        return NextResponse.json({ success: true, message: '파일이 이미 삭제되었습니다.' });
      }
      
      return NextResponse.json(
        { error: '파일 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: '임시 파일이 삭제되었습니다.' });

  } catch (error: any) {
    console.error('Cleanup API 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}