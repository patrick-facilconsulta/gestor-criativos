alter table criativos
  add column if not exists arquivo_path text,
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_tipo text,
  add column if not exists arquivo_tamanho bigint;

insert into storage.buckets (id, name, public)
values ('entregas', 'entregas', false)
on conflict (id) do nothing;

create policy "Usuários autenticados leem entregas"
  on storage.objects for select to authenticated
  using (bucket_id = 'entregas');

create policy "Usuários autenticados enviam entregas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'entregas');

create policy "Usuários autenticados atualizam entregas"
  on storage.objects for update to authenticated
  using (bucket_id = 'entregas')
  with check (bucket_id = 'entregas');

create policy "Usuários autenticados excluem entregas"
  on storage.objects for delete to authenticated
  using (bucket_id = 'entregas');