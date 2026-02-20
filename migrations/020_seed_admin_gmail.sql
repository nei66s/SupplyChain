BEGIN;

INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  'usr-admin-gmail',
  'Admin Gmail',
  'admin@gmail.com',
  '$2b$10$ERXw9xqRK/JU9MknvbSc6OXdwYL.BBmECpRs7JRCwgYmP2WeAKBq2',
  'Admin'
)
ON CONFLICT (email) DO UPDATE
SET
  id = 'usr-admin-gmail',
  name = 'Admin Gmail',
  password_hash = '$2b$10$ERXw9xqRK/JU9MknvbSc6OXdwYL.BBmECpRs7JRCwgYmP2WeAKBq2',
  role = 'Admin';

COMMIT;
