-- Modificar la tabla users para permitir IDs que no sean de auth.users
-- Esto permite crear clientes sin cuenta de autenticación

-- Primero eliminar la restricción de foreign key
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Cambiar la columna id para que tenga un valor por defecto
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Ahora id puede ser cualquier UUID, no necesariamente de auth.users
