-- SOLUCIÓN TEMPORAL: Deshabilitar RLS completamente
-- Ejecuta esto en el SQL Editor de Supabase

-- Deshabilitar RLS en todas las tablas
ALTER TABLE therapists DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_working_hours DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Opcional: Si quieres volver a habilitarlo más tarde con políticas simples:
-- ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for authenticated" ON therapists TO authenticated USING (true) WITH CHECK (true);
