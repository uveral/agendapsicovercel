-- Seed data for initial setup

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('therapists_can_edit_others', 'false'),
  ('default_appointment_duration', '60'),
  ('business_hours_start', '"08:00"'),
  ('business_hours_end', '"20:00"')
ON CONFLICT (key) DO NOTHING;

-- Insert sample therapists (optional - comment out if not needed)
-- INSERT INTO therapists (id, name, specialty, email, phone, color) VALUES
--   (uuid_generate_v4(), 'Dr. María González', 'Psicología Clínica', 'maria@orienta.com', '+34 600 000 001', '#3b82f6'),
--   (uuid_generate_v4(), 'Dr. Juan Pérez', 'Terapia Familiar', 'juan@orienta.com', '+34 600 000 002', '#10b981'),
--   (uuid_generate_v4(), 'Dra. Ana Martínez', 'Psicología Infantil', 'ana@orienta.com', '+34 600 000 003', '#f59e0b')
-- ON CONFLICT DO NOTHING;
