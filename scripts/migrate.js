import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20250106000001_initial_schema.sql');
    const migration = readFileSync(migrationPath, 'utf8');

    console.log('📄 Running initial schema migration...');

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      // If exec_sql doesn't exist, we need to run it directly
      // This is a workaround - normally you'd use Supabase CLI
      console.log('ℹ️  Note: Direct SQL execution. Please run this SQL in your Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(migration);
      console.log('='.repeat(80) + '\n');
      console.log('📋 Steps:');
      console.log('1. Go to https://rsfqdvshhgrjujgpcktf.supabase.co/project/rsfqdvshhgrjujgpcktf/sql');
      console.log('2. Copy the SQL above');
      console.log('3. Paste it into the SQL Editor');
      console.log('4. Click "Run"');
      console.log('\n✅ After running the SQL, your database will be ready!');
    } else {
      console.log('✅ Schema migration completed successfully!');
    }

    // Read and suggest seed data
    const seedPath = join(__dirname, '../supabase/seed.sql');
    const seed = readFileSync(seedPath, 'utf8');

    console.log('\n📦 Optional: Run seed data for default settings');
    console.log('You can run this in the SQL Editor:\n');
    console.log(seed);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
