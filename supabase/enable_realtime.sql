

alter table results replica identity full;


do $$
begin
  execute 'alter publication supabase_realtime add table results';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table participants';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table series';
exception when duplicate_object then null;
end $$;
