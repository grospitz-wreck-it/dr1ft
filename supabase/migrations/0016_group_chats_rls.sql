alter table group_chats enable row level security;

create policy "authenticated read group_chats" on group_chats for select using (auth.role() = 'authenticated');
create policy "staff manage group_chats" on group_chats for all using (is_platform_staff());
