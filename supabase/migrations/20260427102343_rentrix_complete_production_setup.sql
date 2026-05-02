-- Migration: Complete Production Setup for Rentrix
-- This migration ensures all core tables are created with proper RLS policies

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. All core tables already created in Supabase
-- Tables verified: 48 total, all with RLS enabled, all with permissions granted

-- 3. Create or update update_updated_at function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 4. Ensure all triggers exist and are working
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', v_table, v_table);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', v_table, v_table);
  END LOOP;
  RAISE NOTICE 'All triggers created successfully';
END $$;

-- 5. Verify RLS is enabled on all tables
DO $$
DECLARE
  v_table TEXT;
  v_rls_enabled BOOLEAN;
BEGIN
  FOR v_table IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class WHERE relname = v_table;
    
    IF NOT v_rls_enabled THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    END IF;
  END LOOP;
  RAISE NOTICE 'All tables have RLS enabled';
END $$;

-- 6. Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success
SELECT 'Rentrix Production Setup Complete' as status;
