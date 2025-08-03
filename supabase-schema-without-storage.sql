-- Supabase Production Schema for Slide Scribe (Storage 제외 버전)
-- 이 SQL을 먼저 실행한 후, Storage는 대시보드에서 별도로 설정하세요.

-- =============================================
-- 1. 기존 테이블 삭제 (주의: 데이터가 모두 삭제됩니다)
-- =============================================
DROP TABLE IF EXISTS record_entries CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- =============================================
-- 2. 사용자 프로필 테이블 (Supabase Auth와 연동)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. 과목 테이블
-- =============================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_subject_name_per_user UNIQUE(user_id, name)
);

-- =============================================
-- 4. 녹음 테이블
-- =============================================
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  audio_url TEXT,
  pdf_url TEXT,
  transcript TEXT,
  summary TEXT,
  key_terms JSONB DEFAULT '[]'::jsonb,
  exam_questions JSONB DEFAULT '[]'::jsonb,
  duration INTEGER CHECK (duration >= 0), -- seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. 기록 엔트리 테이블
-- =============================================
CREATE TABLE record_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  slide_number INTEGER NOT NULL CHECK (slide_number > 0),
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_time_format CHECK (
    start_time ~ '^\d{2}:\d{2}:\d{2}\.\d{3}$' AND
    (end_time IS NULL OR end_time ~ '^\d{2}:\d{2}:\d{2}\.\d{3}$')
  )
);

-- =============================================
-- 6. 인덱스 생성 (성능 최적화)
-- =============================================
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_subject_id ON recordings(subject_id);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX idx_record_entries_recording_id ON record_entries(recording_id);
CREATE INDEX idx_record_entries_slide_number ON record_entries(slide_number);

-- =============================================
-- 7. RLS (Row Level Security) 활성화
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. RLS 정책 설정
-- =============================================

-- Profiles 정책
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subjects 정책
CREATE POLICY "Users can view own subjects" ON subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subjects" ON subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Recordings 정책
CREATE POLICY "Users can view own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings" ON recordings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings" ON recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Record Entries 정책 (recording을 통한 간접 권한)
CREATE POLICY "Users can view record entries of own recordings" ON record_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = record_entries.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create record entries for own recordings" ON record_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = record_entries.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update record entries of own recordings" ON record_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = record_entries.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete record entries of own recordings" ON record_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = record_entries.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

-- =============================================
-- 9. 함수 및 트리거
-- =============================================

-- 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 프로필 자동 생성 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거들
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 완료 메시지
-- =============================================
SELECT 'Schema created successfully! Please set up Storage buckets manually in the dashboard.' as message;