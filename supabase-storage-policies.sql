-- Storage RLS 정책 설정
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 1. recordings 버킷 정책 설정
-- 기존 정책 삭제
DELETE FROM storage.policies WHERE bucket_id = 'recordings';

-- recordings 버킷에 대한 정책 생성
INSERT INTO storage.policies (id, bucket_id, policy_name, definition, check_expression, operation) VALUES
('recordings_select_policy', 'recordings', 'Allow public read access', 'true', NULL, 'SELECT'),
('recordings_insert_policy', 'recordings', 'Allow authenticated insert', 'true', 'true', 'INSERT'),
('recordings_update_policy', 'recordings', 'Allow authenticated update', 'true', 'true', 'UPDATE'),
('recordings_delete_policy', 'recordings', 'Allow authenticated delete', 'true', NULL, 'DELETE');

-- 2. documents 버킷 정책 설정
-- 기존 정책 삭제
DELETE FROM storage.policies WHERE bucket_id = 'documents';

-- documents 버킷에 대한 정책 생성
INSERT INTO storage.policies (id, bucket_id, policy_name, definition, check_expression, operation) VALUES
('documents_select_policy', 'documents', 'Allow public read access', 'true', NULL, 'SELECT'),
('documents_insert_policy', 'documents', 'Allow authenticated insert', 'true', 'true', 'INSERT'),
('documents_update_policy', 'documents', 'Allow authenticated update', 'true', 'true', 'UPDATE'),
('documents_delete_policy', 'documents', 'Allow authenticated delete', 'true', NULL, 'DELETE');

-- 확인
SELECT 'Storage policies created successfully!' as message;