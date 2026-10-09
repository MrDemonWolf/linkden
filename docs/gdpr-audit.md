# GDPR Audit Report — LinkDen

**Application:** LinkDen (self-hosted link-in-bio on Cloudflare Workers)
**Audit Date:** 2026-03-31
**Audit Scope:** Full codebase — data collection, processing, storage, third-party flows, and rights mechanisms

> **⚠️ Legal Advice Disclaimer**: This guidance is informational and based on the GDPR text and established regulatory guidance. It does not constitute legal advice. For matters involving significant compliance risk, supervisory authority interaction, or complex cross-border scenarios, consult a qualified data protection lawyer or your DPO.

---

## Status update (2026-10-08)

The findings below are the original 2026-03-31 audit and are kept as written. This table records where each one stands in the code as of 2026-10-08. It is a code review, not legal advice.

| # | Status | Evidence |
|---|--------|----------|
| 1 | ✅ Resolved (mechanism) | Contact form has a required consent checkbox (`contactSubmissionSchema.consent: z.literal(true)`, `packages/validators/src/blocks.ts`) linked to the privacy notice. The operator still has to state the lawful basis in their notice. |
| 2 | ✅ Resolved while the consent banner is on (default) | Analytics run only after the visitor accepts (`hasAnalyticsConsent`, `components/public/consent-banner.tsx`). No IP and no user agent are stored (`requestMeta` returns `{ip, country}` only; `user_agent` written NULL); referrer is kept as a hostname only. 🟡 Turning the banner off records every visitor without consent; the docs and admin warn about this. |
| 3 | 🟡 Partial | The consent banner and contact form link the privacy notice (`branding_pp_url`, URL or in-app text), but configuring a notice is still optional. |
| 4 | ✅ Resolved | `public.getPage` reads only `user.name` / `user.image` and `PUBLIC_PAGE_SETTING_KEYS`; no email. |
| 5 | 🔴 Open | No visitor self-service erasure; deletion is admin-only (single, bulk, or full reset). Document an out-of-band process in the notice. |
| 6 | ✅ Resolved | Daily retention cron: analytics 365d, contacts 365d, audit log 180d, expired sessions and verification tokens deleted (`packages/db/src/retention.ts`, `packages/validators/src/retention.ts`). Values differ from §7's recommendations; see the "Implemented" column there. |
| 7 | 🟡 Operator task | DPAs are executed by each operator; see the updated processor register (§5). |
| 8 | 🟡 Operator task | CAPTCHA (Turnstile, reCAPTCHA v2, hCaptcha) now renders on the contact form and the server sends `remoteip`. The shipped privacy page lists the providers; the operator's notice must too. |
| 9 | 🟡 Partial | `backup.export` gives the admin a JSON export of their data. |
| 10 | 🔴 Open | Secrets in `site_settings` are masked in API responses and excluded from backups, but stored in plaintext in D1. |
| 11 | ✅ Resolved | `audit_log` table + `logAudit` for settings, imports, deletes, danger resets, wallet changes and `contact.email_failed`; no IP or UA stored. |
| 12 | 🟡 Partial | Structured JSON error logs (PII-redacted, `apps/server/src/lib/log.ts`), `/api/health`, and failing cron runs are visible in Workers observability. No breach procedure is documented. |
| 13 | ✅ Resolved | Birthday is optional and validated. |
| 14 | ✅ Resolved | "Where did we meet?" is asked only when the block enables `showWhereMet` or uses the `connect` preset (`shouldAskWhereMet`). |
| 15 | ✅ Resolved while the banner is on | Same as #2: the default is no analytics until opt-in. |
| 16 | ✅ Resolved | Footer "Cookie settings" link reopens the consent preferences (`openConsentPreferences`); choices expire after 12 months or on a consent-version bump. |

Data flows added since the audit: third-party embed providers (YouTube, Spotify, SoundCloud, custom; click-to-load while the banner is on), CAPTCHA providers, Gravatar (admin panel only, email MD5 when no avatar is uploaded) and a server-side GitHub update check (no personal data). Location blocks contact no map provider (outbound link only).

---

## 1. Personal Data Identified

| Data Type | Location | Classification | Art. 4(1) Category |
|-----------|----------|----------------|---------------------|
| Name, email, profile image | `packages/db/src/schema/auth.ts` — `user` table | Direct identifier | Personal data |
| Session IP address, user agent, token | `auth.ts` — `session` table | Device/network identifier | Personal data (Recital 30) |
| Contact form: name, email, phone, company, message, whereMet | `contacts.ts` — `contact_submission` table | Direct identifier + communications content | Personal data |
| Analytics: userAgent, referrer, country | `analytics.ts` — `page_view` + `link_click` tables | Behavioural/device identifier | Personal data (Recital 30) |
| vCard: fullName, birthday, email, phone, address, org, title | `packages/api/src/routers/vcard.ts` | Direct identifier + date of birth | Personal data (birthday = potentially sensitive) |
| Account access/refresh tokens, password hash | `auth.ts` — `account` table | Credential data | Personal data |
| Email verification identifier | `auth.ts` — `verification` table | Direct identifier | Personal data |

**Special category data (Art. 9):** Birthday stored in vCard — not strictly special category under Art. 9, but date of birth can contribute to age inference. No Art. 9 special category data identified.

---

## 2. Lawful Basis Assessment (Art. 6)

| Processing Activity | Data Involved | Current Basis | Assessment |
|--------------------|---------------|---------------|------------|
| Admin account creation & authentication | name, email, password hash, session IP/UA | **Contract (Art. 6(1)(b))** — admin operates the service | ✅ Adequate |
| Session management | session token, IP, userAgent | **Contract (Art. 6(1)(b))** | ✅ Adequate for admin sessions |
| Contact form collection | name, email, phone, company, message | **Unclear** — no stated lawful basis, no consent | 🔴 Gap |
| Analytics tracking (page views, link clicks) | userAgent, referrer, country | **Unclear** — no consent, no LIA documented | 🔴 Gap |
| vCard data display | personal contact details | **Legitimate interests (Art. 6(1)(f))** — publicly published by admin | 🟡 LIA should be documented |
| Email delivery via Resend | email address | **Contract (Art. 6(1)(b))** for auth emails; **unclear** for contact notifications | 🟡 Partial gap |
| CAPTCHA verification | visitor IP/behaviour data sent to Turnstile/reCAPTCHA | **Legitimate interests** possible, but undisclosed | 🟡 Gap — requires disclosure |
| Backup export of contact PII | all contact submission fields | Inherits basis of original processing | 🟡 Depends on resolution of contact form basis |

---

## 3. Findings

| # | Severity | Article | Issue | Recommendation |
|---|----------|---------|-------|----------------|
| 1 | 🔴 High | Art. 6(1), Art. 13 | **No lawful basis documented or implemented for contact form processing.** Visitors submit name, email, phone, and message with no privacy notice, no consent checkbox, and no stated lawful basis. | Add a consent checkbox linked to a privacy notice on the contact form (`apps/web` contact component). Alternatively, rely on legitimate interests (Art. 6(1)(f)) and conduct a Legitimate Interests Assessment (LIA) — but consent is safer given the sensitivity of the collected data. |
| 2 | 🔴 High | Art. 6(1), Art. 5(1)(a), Recital 30 | **Analytics tracking (page views, link clicks) collects device identifiers (userAgent, country) from all visitors without consent or disclosed lawful basis.** Even without IP address, userAgent + country + referrer can be used to fingerprint visitors. | Either (a) obtain cookie/analytics consent before tracking, or (b) anonymise analytics at collection time (drop userAgent, store only generalised country), or (c) document a robust LIA. A cookie banner implementing (a) is the most defensible approach. |
| 3 | 🔴 High | Art. 13, Art. 12(1) | **No privacy notice presented to visitors at any point.** The `branding_pp_url` is an optional admin-configured link — it is not surfaced to visitors by default and contains no guaranteed GDPR-mandated content. Art. 13 requires controllers to provide notice at the time of collection. | Require the admin to configure a privacy policy URL during setup. Surface it prominently on the public page and contact form. Provide a GDPR-compliant privacy notice template (see §7 below). |
| 4 | 🔴 High | Art. 4(1), Art. 25(1) | **User email is exposed publicly** via the `getPage` tRPC endpoint (`packages/api/src/routers/public.ts`). The admin's email address is returned to all unauthenticated visitors. | Remove `email` from the `getPage` public response. Display name and avatar are sufficient for a link-in-bio page. Email is not needed publicly. |
| 5 | 🔴 High | Art. 17 | **No right-to-erasure mechanism for contact form submitters.** Public visitors who submitted contact data have no way to request deletion through the application. Only admin can delete submissions manually. | Implement a self-service erasure request endpoint (e.g., `POST /api/erasure-request` requiring email verification) or clearly document an out-of-band process (email contact) in the privacy notice. |
| 6 | 🟡 Medium | Art. 5(1)(e) | **No data retention policy or automated deletion.** Analytics data, session records, and contact submissions accumulate indefinitely. | Define retention periods: e.g., analytics → 90 days, sessions → 30 days post-expiry, contact submissions → 2 years. Implement automated purge jobs (Cloudflare CRON Trigger or scheduled Worker). |
| 7 | 🟡 Medium | Art. 28(3) | **No Data Processing Agreements (DPAs) documented for third-party processors.** Resend (email), Cloudflare (infrastructure, CAPTCHA), and Apple (Wallet, optional) process personal data without documented DPAs in the codebase or README. | Execute DPAs with Resend and confirm Cloudflare's DPA covers D1, R2, and Workers. Document these in a processor register. (Note: Cloudflare's standard DPA is available; Resend offers DPA on request.) |
| 8 | 🟡 Medium | Art. 13(1)(e), Art. 44 | **CAPTCHA providers (Cloudflare Turnstile, Google reCAPTCHA) receive visitor IP/behavioural data.** No disclosure to visitors. Google reCAPTCHA involves a US transfer; Cloudflare Turnstile is more privacy-preserving but still a third-party disclosure. | Disclose CAPTCHA processor(s) in the privacy notice. For reCAPTCHA, document the Art. 46 transfer mechanism (Standard Contractual Clauses). Consider making Turnstile the default (more privacy-friendly). |
| 9 | 🟡 Medium | Art. 20 | **No data portability mechanism for the admin user.** The backup export covers operational data but is not designed as a data subject access/portability tool. | The backup export (`backup.export`) could be repurposed to serve Art. 20 portability for the admin. Document this in the privacy notice. |
| 10 | 🟡 Medium | Art. 32(1)(a) | **API keys (Resend, CAPTCHA) stored as plaintext in the `site_settings` database table.** Only masked at the API response layer; plaintext accessible to anyone with D1 database access. | Encrypt application-level secrets stored in the database, or migrate them to Cloudflare Workers Secrets (environment-level) rather than database-level storage. |
| 11 | 🟡 Medium | Art. 5(2), Art. 24 | **No audit logging of admin actions.** There is no record of when settings were changed, data was deleted, or backups were imported. This undermines the accountability principle. | Implement an audit log table capturing admin action type, timestamp, and affected resource. Even a lightweight append-only log satisfies Art. 5(2). |
| 12 | 🟡 Medium | Art. 33–34 | **No breach detection or notification procedure.** There is no monitoring, no error tracking, and no documented breach response process. | Integrate an error monitoring service (e.g., Sentry). Document a breach response procedure covering the 72-hour notification window (Art. 33(1)). |
| 13 | 🟢 Low | Art. 5(1)(c) | **vCard birthday field may be unnecessary for most use cases.** Date of birth is collected but has no demonstrated necessity for link-in-bio functionality. | Make birthday optional (it may already be) and add UI guidance that it is not required. |
| 14 | 🟢 Low | Art. 5(1)(c) | **`whereMet` field in contact form has unclear purpose.** Collecting where the admin met the contact visitor is unusual for a public contact form and may not be necessary. | Remove `whereMet` from the public contact form or document its specific, necessary purpose. |
| 15 | 🟢 Low | Art. 25(2) | **Analytics tracking is on by default** with no mechanism for visitors to opt out. Privacy by Default (Art. 25(2)) requires the most privacy-protective settings to be applied by default. | Default analytics to disabled and require explicit admin opt-in, or implement visitor opt-out. |
| 16 | 🟢 Low | Art. 7(3) | **No consent withdrawal mechanism.** If consent is used as a lawful basis for any processing, withdrawal must be as easy as giving it. | Ensure any future consent mechanism includes a withdrawal option (e.g., clear opt-out link in contact confirmation emails). |

---

## 4. Data Subject Rights Gap Analysis (Art. 15–22)

| Right | Article | Status | Gap |
|-------|---------|--------|-----|
| Right of access | Art. 15 | 🔴 Not implemented | No subject access request mechanism. Admin must manually query D1. |
| Right to rectification | Art. 16 | 🟡 Partial | Admin can edit contact submissions; no self-service for visitors. |
| Right to erasure | Art. 17 | 🔴 Not implemented | Admin-only delete. No self-service for public visitors. |
| Right to restriction | Art. 18 | 🔴 Not implemented | No mechanism to flag or restrict processing of specific records. |
| Right to portability | Art. 20 | 🟡 Partial | Backup export exists but not designed for data subject portability. |
| Right to object | Art. 21 | 🔴 Not implemented | No opt-out mechanism for analytics or any processing. |
| Rights re: automated decisions | Art. 22 | ✅ Not applicable | No automated decision-making identified. |

---

## 5. Third-Party Processor Register

| Processor | Purpose | Data Shared | Transfer Basis | DPA Status |
|-----------|---------|-------------|----------------|------------|
| **Cloudflare** (D1, R2, Workers, Pages) | Infrastructure, database, file storage | All personal data in D1 + R2 | EU Standard Contractual Clauses (available) | ✅ Available — must be executed |
| **Cloudflare Turnstile** | CAPTCHA verification | Visitor IP, behavioural signals | EU SCCs | ✅ Covered under Cloudflare DPA |
| **Resend** (api.resend.com) | Transactional email delivery | User email addresses | EU SCCs available | 🟡 DPA must be requested |
| **Google reCAPTCHA** (optional) | CAPTCHA verification | Visitor IP, browser fingerprint | EU SCCs | 🟡 Google's DPA covers this; must be verified |
| **Apple** (Wallet, optional) | Wallet pass signing | Pass metadata only | US company — SCCs required | 🟡 Document if Wallet feature is enabled |
| **hCaptcha** (optional, added 2026-10) | CAPTCHA verification | Visitor IP, browser signals | EU SCCs | 🟡 Operator must review the provider DPA |
| **Embed providers** (YouTube, Spotify, SoundCloud, custom; optional, added 2026-10) | Media embeds on the public page | Visitor IP and browser data (loaded directly by the visitor's browser; click-to-load while the consent banner is on) | Provider-specific | 🟡 Disclose in the operator's notice |
| **Gravatar** (Automattic; added 2026-10) | Admin avatar fallback | MD5 hash of the admin's email (admin panel only) | Provider-specific | 🟢 Admin-only; disclose or upload an avatar |
| **GitHub** (added 2026-10) | Update check | None (server-side request) | — | ✅ No personal data |

---

## 6. Consent Mechanism Gaps

| Area | Current State | Required | Gap |
|------|---------------|----------|-----|
| Session cookie | Set on first auth request, no prior consent | Strictly necessary for auth — consent may not be required | 🟢 Acceptable for auth-only cookies, but must be disclosed |
| Analytics cookies/tracking | Active on all page loads, no consent | Consent required (Art. 6(1)(a)) unless anonymised | 🔴 Implement consent banner or anonymise |
| Contact form | Submitted without privacy notice link or consent checkbox | Art. 13 notice required at collection; consent or LIA needed | 🔴 Add privacy notice link + consent checkbox or document LIA |
| CAPTCHA | Active on contact form and auth, no disclosure | Disclosure required (Art. 13(1)(e)) | 🟡 Add to privacy notice |

---

## 7. Data Retention Recommendations

| Data Category | Recommended Retention | Implemented (2026-10-08) | Justification |
|--------------|----------------------|--------------------------|---------------|
| Session records | 30 days after session expiry | Deleted daily once expired | Sessions have no ongoing value after expiry |
| Auth tokens (magic link, verification) | Delete immediately on use or 24h expiry | Magic links expire in 10 min; expired verification rows deleted daily | Already time-limited; purge expired records |
| Analytics (page views, link clicks) | 90 days rolling | 365 days | Provides sufficient trend analysis; minimises retention |
| Contact form submissions | 2 years | 365 days | Reasonable for business contact management |
| Audit log | — | 180 days | Accountability (Art. 5(2)) |
| User account data | Duration of service + 30 days after deletion request | Until a factory reset | Art. 17 compliance |
| Backup exports | Per admin discretion, but document in privacy policy | Nightly D1 dumps kept 30 days in R2 | Backups are controller responsibility |

---

## 8. Record of Processing Activities (RoPA) — Art. 30 Template

The following RoPA entries should be documented:

**Entry 1: Admin Account Management**
- Controller: [Site owner]
- Purpose: Authentication and account management
- Data: name, email, password hash, session data
- Lawful basis: Art. 6(1)(b) — contract
- Recipients: Cloudflare (infrastructure), Resend (email)
- Retention: Duration of service
- Transfer safeguard: EU SCCs with Cloudflare and Resend

**Entry 2: Visitor Analytics**
- Controller: [Site owner]
- Purpose: Understanding visitor behaviour
- Data: userAgent, country, referrer
- Lawful basis: To be determined — consent (Art. 6(1)(a)) or documented LIA (Art. 6(1)(f))
- Recipients: Cloudflare D1
- Retention: 90 days (recommended)

**Entry 3: Contact Form Processing**
- Controller: [Site owner]
- Purpose: Responding to visitor enquiries
- Data: name, email, phone, company, message
- Lawful basis: Consent (Art. 6(1)(a)) — preferred; or LIA (Art. 6(1)(f))
- Recipients: Cloudflare D1, Resend (notification email)
- Retention: 2 years (recommended)

---

## 9. Summary & Priority Actions

### Overall Compliance Posture
LinkDen has solid technical security foundations (rate limiting, httpOnly cookies, input sanitisation, auth protection) but significant GDPR gaps in transparency, consent, and data subject rights — particularly for **public visitors** who interact with the contact form and are tracked via analytics.

As a self-hosted single-user application, the admin is the **data controller** under GDPR, not Anthropic or the LinkDen developers. The controller is responsible for ensuring compliance.

### Priority Actions (Ordered by Severity)

> **Open items as of 2026-10-08** (see the status update at the top): #3 notice reachability (make a privacy notice mandatory), #5 visitor erasure, #10 secrets at rest, #12 breach procedure, plus the operator tasks #7/#8 (DPAs, disclosure). Items struck through below are done.

**Immediate (🔴 High — address before going live with visitor data):**
1. ~~**Remove email from `getPage` response**~~ — resolved
2. **Add privacy notice to contact form** — partial: linked when configured, not yet mandatory
3. ~~**Add consent checkbox to contact form**~~ — resolved
4. ~~**Implement analytics opt-out or anonymisation**~~ — resolved (consent banner, on by default; no IP/UA stored)
5. **Draft and publish a GDPR-compliant privacy notice** — operator task

**Short-term (🟡 Medium — within 30 days):**
6. **Implement data erasure request flow** for contact form submitters — open
7. **Execute DPAs** with Cloudflare and Resend (and any optional processor in §5) — operator task
8. ~~**Define and implement data retention policies**~~ — resolved (daily cron)
9. **Encrypt or migrate application secrets** out of the `site_settings` DB table — open
10. ~~**Implement audit logging** for admin actions~~ — resolved
11. **Document breach response procedure** — open

**Ongoing (🟢 Low — best practice improvements):**
12. ~~Review `whereMet` field necessity~~ — resolved (opt-in per form)
13. ~~Make birthday optional with clearer UI guidance~~ — resolved
14. ~~Default analytics to disabled~~ — resolved while the consent banner is on (default)
15. Complete RoPA documentation for all processing activities — operator task (update Entry 2: analytics data is now country + referrer hostname, 365 days)
