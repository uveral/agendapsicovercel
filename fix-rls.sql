-- EJECUTA ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE
-- Esto arreglará el problema de recursión infinita

-- 1. Drop políticas problemáticas en therapists
DROP POLICY IF EXISTS "Therapists can be created by admins" ON therapists;
DROP POLICY IF EXISTS "Therapists can be updated by admins" ON therapists;
DROP POLICY IF EXISTS "Therapists can be deleted by admins" ON therapists;

-- 2. Crear política simple para therapists
DROP POLICY IF EXISTS "Allow authenticated users to manage therapists" ON therapists;
CREATE POLICY "Allow authenticated users to manage therapists"
  ON therapists
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Drop políticas problemáticas en users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins and therapists can create users" ON users;

-- 4. Crear políticas simples para users
DROP POLICY IF EXISTS "Allow authenticated users to view all users" ON users;
CREATE POLICY "Allow authenticated users to view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON users;
CREATE POLICY "Allow authenticated users to update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated users to create users" ON users;
CREATE POLICY "Allow authenticated users to create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON users;
CREATE POLICY "Allow authenticated users to delete users"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- 5. Fix client_availability policies
DROP POLICY IF EXISTS "Users can view their own availability" ON client_availability;
DROP POLICY IF EXISTS "Users can manage their own availability" ON client_availability;

DROP POLICY IF EXISTS "Allow authenticated users to view availability" ON client_availability;
CREATE POLICY "Allow authenticated users to view availability"
  ON client_availability FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage availability" ON client_availability;
CREATE POLICY "Allow authenticated users to manage availability"
  ON client_availability
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Fix therapist_working_hours policies
DROP POLICY IF EXISTS "Therapist working hours viewable by authenticated" ON therapist_working_hours;
DROP POLICY IF EXISTS "Admins can manage therapist working hours" ON therapist_working_hours;

DROP POLICY IF EXISTS "Allow authenticated users to view working hours" ON therapist_working_hours;
CREATE POLICY "Allow authenticated users to view working hours"
  ON therapist_working_hours FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage working hours" ON therapist_working_hours;
CREATE POLICY "Allow authenticated users to manage working hours"
  ON therapist_working_hours
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Fix appointments policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;

DROP POLICY IF EXISTS "Allow authenticated users to view appointments" ON appointments;
CREATE POLICY "Allow authenticated users to view appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage appointments" ON appointments;
CREATE POLICY "Allow authenticated users to manage appointments"
  ON appointments
  TO authenticated
  USING (true)
  WITH CHECK (true);
