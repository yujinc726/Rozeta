-- record_entries 테이블에 AI 설명 관련 필드 추가
ALTER TABLE record_entries
ADD COLUMN ai_explanation JSONB DEFAULT '{}'::jsonb,
ADD COLUMN ai_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ai_model VARCHAR(100);

-- AI 설명 JSON 구조 예시:
-- {
--   "summary": "3-5줄 핵심 요약",
--   "detailed": "상세 설명",
--   "key_points": ["포인트1", "포인트2"],
--   "connections": {
--     "previous": "이전 슬라이드와의 연결",
--     "next": "다음 슬라이드로의 전개"
--   },
--   "exam_points": ["시험 출제 예상 포인트"],
--   "examples": ["실제 예시"],
--   "study_tips": "효과적인 학습 방법"
-- }

-- recordings 테이블에 전체 강의 AI 분석 결과 저장
ALTER TABLE recordings
ADD COLUMN ai_lecture_overview JSONB DEFAULT '{}'::jsonb,
ADD COLUMN ai_analyzed_at TIMESTAMP WITH TIME ZONE;

-- AI 전체 강의 분석 JSON 구조 예시:
-- {
--   "main_topic": "전체 강의 주제",
--   "key_concepts": ["개념1", "개념2"],
--   "flow": "강의 흐름 요약",
--   "important_slides": [5, 12, 18],
--   "suggested_review_order": [1, 5, 12]
-- }