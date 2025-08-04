-- recordings 테이블에 subtitles 컬럼 추가
ALTER TABLE recordings
ADD COLUMN subtitles TEXT;

-- 기존 데이터의 subtitles를 transcript와 동일하게 설정 (선택사항)
-- UPDATE recordings SET subtitles = transcript WHERE transcript IS NOT NULL;