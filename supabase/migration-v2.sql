-- ═══════════════════════════════════════════════════════════════════
-- FORGE v2 migration — run once in the SQL editor (safe to re-run).
-- Allows custom day routines beyond A/B/C: the day_type check becomes
-- free text. Nothing else changes; no data is touched.
-- ═══════════════════════════════════════════════════════════════════

alter table forge_routines drop constraint if exists forge_routines_day_type_check;
