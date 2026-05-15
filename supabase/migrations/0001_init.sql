-- =============================================
-- 하루콩 초기 스키마
-- Supabase 대시보드 → SQL Editor에 전체 붙여넣기
-- =============================================

-- 안전하게 처음부터 다시 실행 가능하게 — 기존 테이블 정리
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.reactions     cascade;
drop table if exists public.posts         cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups        cascade;
drop table if exists public.users         cascade;


-- ① 유저
-- auth.users는 Supabase가 자동 관리. 여기선 앱 전용 추가 정보만 저장.
create table public.users (
  id            uuid primary key references auth.users on delete cascade,
  nickname      text not null,
  avatar_url    text,
  theme         text not null default 'mint'
                  check (theme in ('mint','lavender','peach','sky','butter','pink')),
  streak        int  not null default 0,
  last_posted_at date,
  created_at    timestamptz not null default now()
);

-- ② 그룹
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null,
  owner_id    uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ③ 그룹 멤버
create table public.group_members (
  group_id  uuid references public.groups(id) on delete cascade,
  user_id   uuid references public.users(id)  on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ④ 게시물
-- posted_date: "이 게시물이 어느 날의 기록인지" — 한국 시간 기준 날짜
-- 하루 1개 제한 인덱스에 쓰임
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id)  on delete cascade,
  group_id    uuid references public.groups(id) on delete cascade,
  photo_url   text,
  text        text,
  ai_comment  text,
  posted_date date not null default current_date,
  created_at  timestamptz not null default now()
);

-- 하루 1개 제한: 같은 user + group + 날짜에 중복 방지
create unique index posts_one_per_day
  on public.posts (user_id, group_id, posted_date);

-- ⑤ 이모지 반응
create table public.reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  user_id    uuid references public.users(id) on delete cascade,
  emoji      text not null check (emoji in ('🥹','👍','🔥','🫶')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);


-- =============================================
-- RLS (Row Level Security) — 내 데이터만 보이게
-- =============================================
-- "경비원" 설정. 없으면 누구나 모든 데이터 읽기 가능.

alter table public.users        enable row level security;
alter table public.groups       enable row level security;
alter table public.group_members enable row level security;
alter table public.posts        enable row level security;
alter table public.reactions    enable row level security;

-- users: 본인 프로필만 수정, 읽기는 그룹원끼리
create policy "유저 본인 수정" on public.users
  for all using (auth.uid() = id);

-- groups: 그룹원이면 읽기 가능
create policy "그룹 읽기 — 멤버만" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );
create policy "그룹 생성" on public.groups
  for insert with check (owner_id = auth.uid());

-- group_members: 그룹 멤버 확인
create policy "멤버 읽기" on public.group_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );
create policy "그룹 가입" on public.group_members
  for insert with check (user_id = auth.uid());
create policy "그룹 탈퇴" on public.group_members
  for delete using (user_id = auth.uid());

-- posts: 같은 그룹원이면 읽기, 본인 글만 작성/삭제
create policy "게시물 읽기 — 그룹원" on public.posts
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = posts.group_id and user_id = auth.uid()
    )
  );
create policy "게시물 작성" on public.posts
  for insert with check (user_id = auth.uid());
create policy "게시물 삭제 — 본인" on public.posts
  for delete using (user_id = auth.uid());

-- reactions: 그룹원 읽기, 본인 반응 추가/삭제
create policy "반응 읽기 — 그룹원" on public.reactions
  for select using (
    exists (
      select 1 from public.posts p
      join public.group_members gm on gm.group_id = p.group_id
      where p.id = reactions.post_id and gm.user_id = auth.uid()
    )
  );
create policy "반응 추가" on public.reactions
  for insert with check (user_id = auth.uid());
create policy "반응 삭제 — 본인" on public.reactions
  for delete using (user_id = auth.uid());


-- =============================================
-- 유저 자동 생성 트리거
-- =============================================
-- 소셜 로그인하면 auth.users에 자동 등록되는데,
-- 우리 public.users 테이블엔 수동으로 넣어야 함.
-- 이 트리거가 그걸 자동으로 해줌.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================
-- Storage 버킷 (사진 업로드용)
-- =============================================
-- Supabase Storage = 사진 저장하는 S3 같은 공간
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict do nothing;

-- 로그인한 유저만 업로드 가능
create policy "사진 업로드 — 로그인" on storage.objects
  for insert with check (bucket_id = 'posts' and auth.role() = 'authenticated');

-- 누구나 사진 읽기 가능 (URL로 접근)
create policy "사진 읽기 — 퍼블릭" on storage.objects
  for select using (bucket_id = 'posts');

-- 본인 사진만 삭제
create policy "사진 삭제 — 본인" on storage.objects
  for delete using (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);
