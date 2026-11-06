create extension if not exists pgcrypto with schema extensions;

create table if not exists public."Users" (
  id uuid primary key default gen_random_uuid(),
  "authId" uuid unique references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username)),
  name text not null,
  role text not null default 'STUDENT' check (role in ('STUDENT', 'TEACHER'))
);

create table if not exists public."Config" (
  key text primary key,
  value text not null default ''
);

create table if not exists public."Reports" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  "incidentType" text not null default 'OTHER',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  "imageUrls" jsonb not null default '[]'::jsonb,
  "studentUsername" text not null references public."Users"(username) on update cascade,
  "studentName" text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  "createdAt" timestamptz not null default now(),
  "reviewedAt" timestamptz,
  "reviewedBy" text references public."Users"(username) on update cascade
);

create table if not exists public."Challenges" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  target text not null default '',
  points integer not null check (points between 1 and 10000),
  "endsAt" date not null,
  "proofInstructions" text not null default '',
  active boolean not null default true
);

create table if not exists public."ChallengeProofs" (
  id uuid primary key default gen_random_uuid(),
  "challengeId" uuid not null references public."Challenges"(id) on delete restrict,
  "studentUsername" text not null references public."Users"(username) on update cascade,
  "studentName" text not null,
  "imageUrl" text not null,
  note text not null default '',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  "createdAt" timestamptz not null default now(),
  "reviewedAt" timestamptz,
  "reviewedBy" text references public."Users"(username) on update cascade
);

create index if not exists reports_student_idx on public."Reports" ("studentUsername", "createdAt" desc);
create index if not exists reports_status_idx on public."Reports" (status, "createdAt" desc);
create index if not exists proofs_student_idx on public."ChallengeProofs" ("studentUsername", "createdAt" desc);
create index if not exists proofs_challenge_idx on public."ChallengeProofs" ("challengeId");

alter table public."Users" enable row level security;
alter table public."Config" enable row level security;
alter table public."Reports" enable row level security;
alter table public."Challenges" enable row level security;
alter table public."ChallengeProofs" enable row level security;

revoke all on table public."Users", public."Config", public."Reports", public."Challenges", public."ChallengeProofs" from anon, authenticated;
