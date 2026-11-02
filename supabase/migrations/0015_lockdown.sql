-- The site reads and writes only through the service role on the server; the publishable key is
-- used for Supabase Auth alone. RLS already hides every row from anon/authenticated, but it does
-- not cover TRUNCATE or function calls, so those roles get no rights in public at all.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on all functions in schema public to service_role;
