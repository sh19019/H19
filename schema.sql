-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.birthday_content (
  id integer primary key check (id = 1),
  content jsonb not null default '{"subtitle":"كل سنة وإنتِ أجمل حكاية وأحلى صدفة في حياتي.","letter":"","photos":[],"tracks":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.birthday_content (id)
values (1)
on conflict (id) do nothing;

alter table public.birthday_content enable row level security;

-- The browser never accesses this table directly. Only the Edge Function
-- uses the server-side service-role key. Do not add public policies.
revoke all on table public.birthday_content from anon, authenticated;

-- Create a public bucket for media URLs shown on the guest page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('birthday-media', 'birthday-media', true, 15728640,
        array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm'])
on conflict (id) do update set public = true, file_size_limit = 15728640;
