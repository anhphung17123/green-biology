-- Passwords belong exclusively to Supabase Auth (auth.users). Profiles are
-- linked by protected auth.users.raw_app_meta_data.username.
alter table public."Users"
  drop column if exists pwd;
