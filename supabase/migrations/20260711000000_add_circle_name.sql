alter table public.dhukuti_circles
  add column if not exists name text;

update public.dhukuti_circles
set name = 'Dhukuti #' || circle_id::text
where name is null or btrim(name) = '';

alter table public.dhukuti_circles
  alter column name set not null;

alter table public.dhukuti_circles
  alter column name set default 'Untitled Circle';

alter table public.dhukuti_circles
  add constraint dhukuti_circles_name_length
  check (octet_length(convert_to(btrim(name), 'UTF8')) between 1 and 64) not valid;

alter table public.dhukuti_circles
  validate constraint dhukuti_circles_name_length;
