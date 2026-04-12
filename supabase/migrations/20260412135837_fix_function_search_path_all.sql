-- Migration: fix_function_search_path_all
-- إضافة SET search_path = public لـ _r3 و _safe_date

CREATE OR REPLACE FUNCTION public._r3(v numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT round(coalesce(v,0), 3)
$$;

CREATE OR REPLACE FUNCTION public._safe_date(v text)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN v ~ '^\d{4}-\d{2}-\d{2}' THEN v::date ELSE NULL END
$$;
