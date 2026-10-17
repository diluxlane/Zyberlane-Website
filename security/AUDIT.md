# Zyberlane security audit

Repository baseline: `73908c1`. Audit performed 16–17 October 2026.
Scope: reachable Git history, current static website, admin source, and read-only metadata of the linked shared Supabase project. No production mutation or destructive exploitation.

## Threat model (before remediation)

The repository contains six static HTML pages, shared CSS/JS, and static images. There is no package.json, lockfile, build pipeline, server route or migration history in this checkout. Supabase JS is loaded through jsDelivr. Google Fonts is the other executable/style dependency boundary.

Visitors read CMS settings, services, packages, testimonials and public projects directly from Supabase, and insert leads/upload booking attachments with a public publishable key. Admin users authenticate with Supabase password auth; the admin panel reads and modifies content, client details, payments and gallery images. Clients can manage their own portfolio through shared database policies used by other sites.

Assets: admin sessions, client contact details, internal notes, commercial project metadata, payments, private attachments, storage capacity, and website content integrity. Boundaries: browser ↔ CDN; browser ↔ Supabase Auth/Data API/Storage; public ↔ client member ↔ internal staff; static deployment ↔ provider configuration. Browser checks are convenience controls, not authorization. Realistic paths include compromised CMS data executing in an admin/visitor session, direct API calls ignoring UI validation, public project rows exposing internal columns, and spam exhausting storage/database quotas.

## Findings and disposition

| ID | Severity | Evidence and reachability | Disposition |
|---|---|---|---|
| S1 | HIGH | `renderPackages` concatenated database `currency` and `billing_period` into innerHTML. Admin payment project options also inserted project currency without escaping. CMS write access or compromised content could execute script in visitors/admin browsers. No anonymous CMS write path established. | HTML-encode strings; retain numeric conversion. Browser payload regression check planned/run as recorded below. |
| S2 | MEDIUM | `projects_select` permits every column on `is_public=true` rows; anon has table SELECT. `projects` contains agreed_price, payment_status, client_id, owner_id, repo_url and operational metadata. Frontend previously used select('*'). | Homepage now requests display columns only (data minimization, NOT an authorization fix). Database root cause remains open; requires coordinated public projection and policy change across shared consumers. Aggregate metadata check found zero currently public rows populated with agreed_price/client_id/repo_url/owner_id; no claim of an observed leak of those values. |
| S3 | MEDIUM | `leads_public_insert` uses WITH CHECK(true); table-wide INSERT lets callers supply status, assigned_to and notified_at instead of database defaults. Existing length/FK constraints provide partial validation. | Review-only SQL restricts insert columns. NOT deployed or database-tested. |
| S4 | MEDIUM | Public booking bucket INSERT and lead INSERT require no challenge/token/quota in the inspected policies. Honeypot and 3-second delay exist only in JavaScript and are bypassable. | Open: introduce provider/server enforced abuse protection and quotas covering BOTH Storage and Data API. No load test performed. Individual file sizes/MIME types already restricted by bucket settings. |
| S5 | LOW | SDK URL used floating @2 without SRI on public/admin pages. An upstream release would change executable code without a repository review. | Pin 2.118.0 (the version resolved during audit) with SHA-384 integrity and anonymous CORS. Not claimed to be a vulnerability-free version. |
| S6 | LOW | No repository browser-header configuration existed. Production header request returned 403 in this environment, so live header absence is NOT established. | Netlify _headers and equivalent Vercel configuration add script-hash CSP, frame protection, nosniff, referrer/permissions policy, HSTS (no includeSubDomains/preload), admin no-store/noindex. Hosting activation remains to verify. |
| S7 | LOW | Booking failure displayed raw provider error messages. | Replace with generic visitor-facing failure. |
| S8 | LOW | Supabase advisor reports leaked-password protection disabled. | Provider action required, subject to plan availability. |
| S9 | INFORMATIONAL | No .gitignore; publishable key and project URL are intentionally public. | Ignore local credentials/deployment artifacts. No secret rotation required by findings from the bounded scan. |
| S10 | INFORMATIONAL | Advisor flags callable SECURITY DEFINER helpers is_internal/is_client_member and event trigger rls_auto_enable. | Helpers bind to auth.uid(), return authorization booleans and support RLS; blindly revoking/changing to INVOKER can break policies. No escalation proven. Review-only SQL revokes API access to event trigger. |

## Secret/history review

Scanned 66 reachable commits and 72 distinct reachable blobs (binary image content excluded from textual credential matching). Looked for private key markers, Supabase secret/service-role labels, GitHub tokens, common provider secret prefixes and literal password/secret/token/database assignments. No matching secret found. Tracked paths include no environment files, credential backups or server configurations. This is a bounded pattern/manual review, not proof that arbitrary encoded/custom-format secrets or deleted unreachable Git objects never existed. Never rotate the public publishable key merely because it appears in HTML.

## Database verification

Read-only catalog inspection confirmed RLS on all 14 public tables. Private lead/note/payment operations are gated by is_internal(); client membership checks use auth.uid(). A BEFORE UPDATE trigger prevent_role_self_escalation guards role changes; new-user creation does not copy a user-supplied role. Storage buckets: booking attachments private, 10 MiB/file, image/PDF/Word allowlist; client files private; client portfolio public, 5 MiB/file, JPEG/PNG/WebP only; public assets public, 10 MiB/file. Public portfolio storage objects remain retrievable even if a gallery database row is unpublished—unpublish is not confidentiality or object deletion. No private object URLs or customer rows were retrieved.

Functions were reviewed: authorization helpers use fixed search_path and caller identity; portfolio reorder uses SECURITY INVOKER, client membership checks, parameterized SQL and client scoping. No command execution, dynamic user SQL, server fetch endpoint, eval, deserialization endpoint, postMessage handler, cookie-based app server, or custom JWT verifier was found. Thus SSRF, server command injection, conventional SQL injection and cookie-server CSRF have no identified project implementation here. Browser bearer-token sessions remain exposed if same-origin script execution is obtained.

## Deployment and dependencies

Static deploy: no production build command or dependency lockfile exists, so npm audit/build/typecheck/lint are not applicable. The CDN SDK is pinned and checked with SRI; a comprehensive transitive advisory scan was not completed. CSP derives from current resources: self + pinned CDN scripts + hashes of inline executable scripts; Google Fonts styles/fonts; HTTPS/data images for CMS compatibility; project-specific Supabase HTTP/WebSocket connections. Inline styles remain allowed because the design uses them extensively. No unsafe-inline/unsafe-eval for scripts. Adding/editing inline scripts requires updating hashes in BOTH hosting files. Headers do not protect direct API responses or fix database authorization.

## Manual actions / rollout

1. Review/test `REVIEW-BEFORE-DEPLOY.sql` on a disposable copy, including any other shared client consumers. It is a proposal, not a deployed migration.
2. Resolve S2 with a public display-only projection and coordinated consumer/policy updates. The JavaScript column list alone does not close direct API exposure.
3. Add server/provider abuse controls before claiming booking is hardened against spam or quota exhaustion. A frontend CAPTCHA alone is insufficient if direct database/storage inserts remain open.
4. Enable leaked-password protection if available; review signup availability, auth rate limits, MFA and recovery controls in the provider. These settings were not comprehensively retrieved.
5. Deploy branch preview; verify security headers on real HTTPS routes including /admin and /admin/, fonts, CMS and signed downloads. A manual Netlify upload must include _headers. Vercel headers apply only to Vercel deployments. Do not merge until preview/provider checks are accepted.
6. Re-run SDK advisory review and periodically re-pin deliberately. No confirmed compromised credential requiring rotation was found.

## Remaining limits / impact

No intentional layout, branding, CSS, text presentation, navigation, animation or normal booking behavior change. Malicious CMS markup renders as text; booking errors become generic; framing and unnecessary browser permissions are blocked. Actual authenticated admin CRUD, signed private downloads, real booking submission and cross-client write isolation were not exercised against production. No claim of complete penetration coverage or guaranteed security. Database weaknesses S2–S4 remain open until provider-side changes are deployed and verified.

## Regression check results

- `node security/verify.cjs`: PASS. Six inline executable scripts and shared JS parse; JSON-LD parses; all inline executable script hashes match both hosting CSPs; three malicious currency/billing-period payloads encode as text; normal package price markup preserved; SDK pin/integrity attributes and query/error guards present.
- SHA-384 recomputed from downloaded SDK bytes: matches the pinned script integrity attributes.
- Baseline comparison: non-script HTML and embedded CSS byte-identical for homepage and admin; shared CSS/JS and remaining four pages unmodified. This is source preservation evidence, not rendered screenshot proof.
- `git diff --check`: PASS.
- Browser regression harness could not launch: Chromium absent; browser installer received invalid archives. No responsive screenshot, navigation, fonts, form submission or live CSP browser check is claimed.
- Supabase metadata/advisor queries were read-only. No SQL proposal was applied; no authenticated CRUD, attack mutation, signup, upload or notification was sent to production.
- Live HTTPS headers remain unverified: request from this environment returned HTTP 403.
- No production build/tests/lint configuration exists. Dependency advisory coverage remains incomplete; no npm audit result is claimed.

Summary by finding severity (includes fixed, open and hardening observations): Critical 0; High 1; Medium 3; Low 4; Informational 2. Draft PR is not deployment approval. Main and production are unchanged.
