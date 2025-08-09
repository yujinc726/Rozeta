-- 1) profiles 테이블에 역할 컬럼 추가 (없으면 생성)
alter table if exists profiles
  add column if not exists role text not null default 'user' check (role in ('user','staff','admin'));

-- 2) 감사 로그 테이블
create extension if not exists "uuid-ossp";
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_actor on audit_logs (actor_user_id);

-- 3) 기본 관리자 승격 예시 (실제 UUID로 교체)
-- update profiles set role = 'admin' where id = 'YOUR_ADMIN_USER_UUID';


