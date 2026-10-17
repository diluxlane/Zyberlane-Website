-- NOT APPLIED. Review and test on a disposable copy of the shared platform first.
-- Apply with the database owner, inside a transaction. Do not run automatically.
-- This prevents public booking requests from setting workflow/notification fields.
-- The admin UI only updates leads, so the observed repository remains compatible.
BEGIN;
REVOKE INSERT ON public.leads FROM anon, authenticated;
GRANT INSERT (name, email, phone, company, project_type, package_interested,
              budget_range, timeline, message, attachments, source)
ON public.leads TO anon, authenticated;
-- Public callers should not have direct SQL capabilities beyond API needs.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;
-- An event trigger cannot legitimately be invoked as an ordinary API RPC.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
COMMIT;

-- PROJECT COLUMN EXPOSURE REQUIRES A SEPARATE COORDINATED CHANGE:
-- 1. Create a dedicated read-only public projection with only public display columns.
--    A deliberately owner-executed view MUST filter is_public=true internally,
--    expose no private columns, use security_barrier=true, and have no write grants.
-- 2. Point all public consumers (including signed-in homepage sessions) at it.
-- 3. Remove the is_public branch from projects_select, preserving internal/member access.
-- 4. Test anonymous, unrelated authenticated, client-member and internal roles.
-- Do not merely change select('*') in JavaScript: direct API requests bypass it.
