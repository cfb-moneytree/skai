insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at
)
values (
  gen_random_uuid(),
  'test@test.com',
  crypt('123456', gen_salt('bf')),
  now()
);
