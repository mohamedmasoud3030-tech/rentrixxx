-- Migration: fix_security_definer_views
-- إعادة بناء 6 views كانت بصلاحية SECURITY DEFINER → security_invoker

DROP VIEW IF EXISTS public.maintenance;
CREATE VIEW public.maintenance WITH (security_invoker = true) AS
SELECT id, no, unit_id, request_date, description, status, cost,
       charged_to, notes, created_at, expense_id, invoice_id,
       completed_at, priority, reported_by, technician_name,
       scheduled_date, work_description, response_time_hours
FROM public.maintenance_records;

DROP VIEW IF EXISTS public.units_full;
CREATE VIEW public.units_full WITH (security_invoker = true) AS
SELECT u.id, u.name AS unit_name, u.property_id,
       p.name AS property_name, u.rent_amount, u.status
FROM public.units u
LEFT JOIN public.properties p ON u.property_id = p.id;

DROP VIEW IF EXISTS public.vw_contract_financial_summary;
CREATE VIEW public.vw_contract_financial_summary WITH (security_invoker = true) AS
SELECT c.id AS contract_id, c.no AS contract_no, c.status AS contract_status,
       COALESCE(SUM(i.amount + COALESCE(i.tax_amount, 0)), 0) AS invoice_total,
       COALESCE(SUM(i.paid_amount), 0) AS paid_total,
       COALESCE(SUM(i.amount + COALESCE(i.tax_amount, 0)), 0) - COALESCE(SUM(i.paid_amount), 0) AS outstanding_total
FROM public.contracts c
LEFT JOIN public.invoices i ON i.contract_id = c.id
GROUP BY c.id, c.no, c.status;

DROP VIEW IF EXISTS public.vw_owner_property_unit_counts;
CREATE VIEW public.vw_owner_property_unit_counts WITH (security_invoker = true) AS
SELECT o.id AS owner_id, o.name AS owner_name,
       COUNT(DISTINCT p.id) AS properties_count, COUNT(DISTINCT u.id) AS units_count
FROM public.owners o
LEFT JOIN public.properties p ON p.owner_id = o.id
LEFT JOIN public.units u ON u.property_id = p.id
GROUP BY o.id, o.name;

DROP VIEW IF EXISTS public.vw_properties_with_owners;
CREATE VIEW public.vw_properties_with_owners WITH (security_invoker = true) AS
SELECT p.id, p.owner_id, p.name, p.address, p.type, p.notes,
       p.created_at, p.location, p.area, p.year_built, p.facilities, p.updated_at,
       o.name AS owner_name
FROM public.properties p
LEFT JOIN public.owners o ON p.owner_id = o.id;

DROP VIEW IF EXISTS public.vw_units_with_property_owner;
CREATE VIEW public.vw_units_with_property_owner WITH (security_invoker = true) AS
SELECT u.id, u.property_id, u.name, u.type, u.status, u.floor, u.area, u.rent,
       u.notes, u.created_at, u.rent_default, u.bedrooms, u.bathrooms, u.updated_at,
       u.rent_amount, p.name AS property_name, o.name AS owner_name
FROM public.units u
LEFT JOIN public.properties p ON u.property_id = p.id
LEFT JOIN public.owners o ON p.owner_id = o.id;

GRANT SELECT ON public.maintenance                   TO authenticated;
GRANT SELECT ON public.units_full                    TO authenticated;
GRANT SELECT ON public.vw_contract_financial_summary TO authenticated;
GRANT SELECT ON public.vw_owner_property_unit_counts TO authenticated;
GRANT SELECT ON public.vw_properties_with_owners     TO authenticated;
GRANT SELECT ON public.vw_units_with_property_owner  TO authenticated;
