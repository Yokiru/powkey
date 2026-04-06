alter table public.orders
add column if not exists public_token uuid;

update public.orders
set public_token = gen_random_uuid()
where public_token is null;

alter table public.orders
alter column public_token set default gen_random_uuid();

alter table public.orders
alter column public_token set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_public_token_key'
  ) then
    alter table public.orders
    add constraint orders_public_token_key unique (public_token);
  end if;
end
$$;
