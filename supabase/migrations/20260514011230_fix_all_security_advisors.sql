-- Historical placeholder migration.
--
-- An earlier advisor-hardening draft used this filename, but the final SQL was
-- consolidated into later guarded migrations.
--
-- Keep this no-op to preserve deterministic migration ordering across
-- production and preview environments.

select 1;
