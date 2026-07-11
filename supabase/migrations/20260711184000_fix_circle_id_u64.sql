alter table public.dhukuti_circles
  alter column circle_id type numeric(20,0)
  using circle_id::numeric;
