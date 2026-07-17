-- Supabase SQL Editor에 붙여넣고 실행한 내용. 처음 한 번만 실행하면 된다.
-- 나중에 "테이블을 어떻게 만들었더라" 싶을 때 보라고 남겨둔 파일이다.

-- 주제 단어
create table topics (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

-- 올라온 글. 대표 문장은 따로 저장하지 않고 body의 첫 문장을 화면에서 뽑아 쓴다.
create table posts (
  id bigint generated always as identity primary key,
  topic_id bigint not null references topics(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index posts_topic_id_idx on posts (topic_id);

-- 보안 규칙 켜기. 이걸 켜야 publishable key를 브라우저에 둬도 안전하다.
alter table topics enable row level security;
alter table posts enable row level security;

-- 주제: 누구나 볼 수 있다. 추가하는 정책은 일부러 만들지 않는다.
create policy "누구나 주제를 볼 수 있다" on topics
  for select using (true);

-- 글: 누구나 보고, 누구나 올린다.
-- 수정/삭제 정책은 일부러 만들지 않았다. 정책이 없으면 아무도 할 수 없다.
create policy "누구나 글을 볼 수 있다" on posts
  for select using (true);

create policy "누구나 글을 올릴 수 있다" on posts
  for insert with check (true);

-- 임시 주제 7개. 나중에 진짜 단어로 바꾸면 된다.
insert into topics (name) values
  ('단어1'), ('단어2'), ('단어3'), ('단어4'), ('단어5'), ('단어6'), ('단어7');


-- ============================================================
-- 여기서부터는 "본인 글 삭제" 기능을 붙이면서 나중에 실행한 것.
-- ============================================================

-- 시험용 글 정리
delete from posts;

-- 비밀번호 암호화 기능
create extension if not exists pgcrypto;

-- 삭제용 비밀번호 칸
alter table posts add column password_hash text not null;

-- 글이 올라오는 순간 비밀번호를 암호화한다. 그래서 원래 비밀번호는 어디에도 남지 않는다.
create function hash_post_password() returns trigger
language plpgsql as $$
begin
  new.password_hash = crypt(new.password_hash, gen_salt('bf'));
  return new;
end $$;

create trigger posts_hash_password
  before insert on posts
  for each row execute function hash_post_password();

-- 암호화된 비밀번호조차 웹에서 읽을 수 없게 한다.
-- 테이블 전체 읽기 권한을 거두고, 필요한 칸만 콕 집어 다시 허락하는 방식.
revoke select on posts from anon;
grant select (id, topic_id, nickname, body, created_at) on posts to anon;

-- 비밀번호가 맞을 때만 지운다. 이 판단은 서버 안에서만 일어난다.
-- security definer라서 이 함수만 삭제할 수 있고, 바깥에서 직접 지우는 건 여전히 막혀 있다.
--
-- search_path에 extensions를 꼭 같이 적어야 한다.
-- 암호화 함수(crypt)가 public이 아니라 extensions 쪽에 설치되어 있어서,
-- public만 적으면 "crypt 함수가 없다"는 에러가 난다.
create function delete_post(post_id bigint, pw text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare deleted int;
begin
  delete from posts where id = post_id and password_hash = crypt(pw, password_hash);
  get diagnostics deleted = row_count;
  return deleted > 0;
end $$;


-- ============================================================
-- 단어 페이지를 타이포그래피 포스터로 바꾸면서 추가한 것.
-- 큰 글씨 자리에 넣을 제목이 필요해졌다.
-- ============================================================

delete from posts;

alter table posts add column title text not null check (char_length(title) between 1 and 20);

-- 새로 만든 칸은 콕 집어 허락해줘야 읽힌다.
-- (위에서 테이블 전체 읽기 권한을 거둬놨기 때문)
grant select (id, topic_id, nickname, title, body, created_at) on posts to anon;


-- ============================================================
-- 닉네임 + 비밀번호 로그인을 붙이면서 추가한 것.
--
-- 주의: 이걸 실행하기 전에 Supabase 대시보드에서
-- Authentication → Sign In / Providers → Email → "Confirm email"을 꺼야 한다.
-- 닉네임을 가짜 이메일로 바꿔 쓰기 때문에 확인 메일을 받을 수 없다.
-- ============================================================

-- 글의 주인. 로그인 이전에 쓰인 글은 주인이 없으므로 비워둘 수 있다.
alter table posts add column user_id uuid references auth.users(id) on delete cascade;

-- 로그인으로 신원을 확인하니 새 글에는 글별 비밀번호를 쓰지 않는다.
-- 기존 글의 비밀번호는 살려둬야 해서 칸은 남기고 필수 조건만 푼다.
alter table posts alter column password_hash drop not null;

-- 비밀번호가 없는 글은 암호화를 건너뛴다. 안 그러면 null을 암호화하려다 터진다.
create or replace function hash_post_password() returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.password_hash is not null and new.password_hash <> '' then
    new.password_hash = crypt(new.password_hash, gen_salt('bf'));
  end if;
  return new;
end $$;

-- 아무나 쓰던 규칙을 걷어내고 로그인한 사람만 쓰게 한다
drop policy if exists "누구나 글을 올릴 수 있다" on posts;

-- auth.uid()는 서버가 로그인 증표에서 직접 꺼내는 값이라 브라우저가 위조할 수 없다.
create policy "로그인한 사람만 자기 이름으로 글을 올린다" on posts
  for insert to authenticated
  with check (auth.uid() = user_id);

-- 본인 글만 지운다. 주인이 없는 옛날 글은 아무도 못 지운다.
create policy "본인 글만 지운다" on posts
  for delete to authenticated
  using (auth.uid() = user_id);

-- 주인이 누구인지 읽을 수 있어야 "내 글"에만 지우기 버튼을 띄울 수 있다.
-- 비밀번호 칸은 여전히 아무도 못 읽는다.
revoke select on posts from anon, authenticated;
grant select (id, topic_id, nickname, title, body, created_at, user_id) on posts to anon, authenticated;
