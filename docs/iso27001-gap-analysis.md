# ISO 27001:2022 Gap Analysis — LinkDen

**Application:** LinkDen (self-hosted link-in-bio on Cloudflare Workers)
**Standard:** ISO/IEC 27001:2022
**Analysis Date:** 2026-03-31
**Scope:** Application codebase, infrastructure configuration, deployment pipelines, and operational procedures

---

## Executive Summary

LinkDen has a solid set of **baseline technical controls** in place (authentication, rate limiting, input validation, TLS, secure cookies) but has **significant gaps** in organisational, operational, and continuity controls. The application lacks formal policies, audit logging, incident response procedures, supplier agreements, and backup automation. For a self-hosted personal application, many ISO 27001 organisational controls are lightweight by nature, but the gaps in monitoring, secrets management, and continuity represent real security risk.

**Overall Posture:** Early-stage technical controls with minimal organisational ISMS framework.

---

## Mandatory Clause Gap Analysis (Clauses 4–10)

| Clause | Requirement | Status | Gap Notes |
|--------|-------------|--------|-----------|
| **4.1** | Context of the organisation | ❌ Not Implemented | No ISMS scope document. No stakeholder or interested parties register. |
| **4.2** | Interested parties | ❌ Not Implemented | Users, regulators (GDPR supervisory authority), hosting providers not formally identified. |
| **4.3** | ISMS scope | ❌ Not Implemented | No documented scope statement defining boundaries of the ISMS. |
| **5.1** | Leadership commitment | ❌ Not Implemented | No signed Information Security Policy from owner/top management. |
| **5.2** | Information Security Policy | ❌ Not Implemented | No formal IS policy document exists. Privacy policy in docs site covers data privacy only. |
| **5.3** | Roles & responsibilities | 🟡 Partial | Implicit single-admin model, but no documented RACI or IS role assignments. |
| **6.1** | Risk assessment process | ❌ Not Implemented | No risk assessment methodology defined or documented. |
| **6.2** | Information security objectives | ❌ Not Implemented | No measurable IS objectives defined. |
| **6.3** | Planning of changes | ❌ Not Implemented | No formal change management process for ISMS changes. |
| **7.1** | Resources | 🟡 Partial | Resources exist (Cloudflare infrastructure) but not formally allocated against IS objectives. |
| **7.2** | Competence | ❌ Not Implemented | No competence records or training logs for IS roles. |
| **7.3** | Awareness | ❌ Not Implemented | No IS awareness programme. |
| **7.4** | Communication | ❌ Not Implemented | No IS communication plan. |
| **7.5** | Documented information | 🟡 Partial | Some technical documentation exists (CLAUDE.md, README) but no formal ISMS document control. |
| **8.1** | Operational planning | 🟡 Partial | Rate limiting, auth controls in place. No formal operational IS plans. |
| **8.2** | Risk assessment (execution) | ❌ Not Implemented | No risk assessments performed or recorded. |
| **8.3** | Risk treatment | ❌ Not Implemented | No risk treatment plan. Controls exist but are not mapped to a risk register. |
| **9.1** | Monitoring & measurement | ❌ Not Implemented | No IS metrics, KPIs, or measurement process defined. |
| **9.2** | Internal audit | ❌ Not Implemented | No internal audit programme or audit records. |
| **9.3** | Management review | ❌ Not Implemented | No management review process or records. |
| **10.1** | Nonconformity & corrective action | ❌ Not Implemented | No nonconformity tracking or corrective action log. |
| **10.2** | Continual improvement | ❌ Not Implemented | No formal continual improvement process. |

---

## Annex A Control Gap Analysis (ISO 27001:2022)

### Theme A.5 — Organisational Controls

| Control ID | Control Name | Status | Evidence Found | Gap Notes | Priority |
|-----------|-------------|--------|---------------|-----------|----------|
| A.5.1 | Policies for information security | ❌ Not Implemented | None | No Information Security Policy document exists. | 🔴 High |
| A.5.2 | IS roles and responsibilities | 🟡 Partial | Single-admin model implicit in code | No formal RACI or IS role assignment document. | 🟡 Medium |
| A.5.3 | Segregation of duties | N/A | Single-user application by design | Acceptable exclusion — document in SoA with justification. | N/A |
| A.5.7 | Threat intelligence | ❌ Not Implemented | None | No threat intelligence feeds or vulnerability tracking process. No Dependabot/Renovate. | 🟡 Medium |
| A.5.9 | Inventory of assets | ❌ Not Implemented | None | No formal asset inventory. Assets include: D1 database, R2 bucket, Workers, Pages, source code, signing credentials. | 🟡 Medium |
| A.5.10 | Acceptable use | ❌ Not Implemented | None | No acceptable use policy for the admin or any contributors. | 🟢 Low |
| A.5.12 | Classification of information | ❌ Not Implemented | None | No data classification scheme. Data includes public (link pages), internal (settings), confidential (API keys, contact PII). | 🟡 Medium |
| A.5.15 | Access control | 🟡 Partial | `protectedProcedure` middleware, signup lock, 2FA | No access control policy document. Client-side auth redirect only — no edge middleware. No session revocation UI. | 🟡 Medium |
| A.5.16 | Identity management | 🟡 Partial | Better Auth handles user lifecycle | Single user — lifecycle management is minimal. No offboarding procedure documented. | 🟢 Low |
| A.5.17 | Authentication information | 🟡 Partial | bcrypt/scrypt for passwords, BETTER_AUTH_SECRET as Worker secret | Application-level secrets (Resend API key, CAPTCHA secret) stored as **plaintext in D1 `site_settings` table**. Default infra password `please-change-this` in `packages/infra/.env`. | 🔴 High |
| A.5.18 | Access rights | 🟡 Partial | Single admin role | No formal access rights review process. Wallet cert/key not masked in API response. | 🟡 Medium |
| A.5.19 | IS in supplier relationships | ❌ Not Implemented | None | No supplier security requirements defined or assessed for Cloudflare, Resend, Apple, CAPTCHA providers. | 🟡 Medium |
| A.5.20 | IS in supplier agreements | ❌ Not Implemented | None | No DPAs or security agreements documented or executed for any third-party processor. | 🔴 High |
| A.5.21 | ICT supply chain | ❌ Not Implemented | None | No software supply chain risk management. No dependency scanning (no Dependabot, Snyk, `npm audit` in CI). | 🟡 Medium |
| A.5.22 | Supplier service monitoring | ❌ Not Implemented | None | No process to monitor Cloudflare, Resend, or other supplier service delivery or changes. | 🟢 Low |
| A.5.23 | Cloud services security | 🟡 Partial | Cloudflare Workers/D1/R2 used appropriately | No formal cloud security policy or exit strategy documented. No assessment of Cloudflare's security posture. | 🟡 Medium |
| A.5.24 | Incident management planning | ❌ Not Implemented | None | No incident response plan or procedure. No defined incident classification criteria. | 🔴 High |
| A.5.25 | Assessment of IS events | ❌ Not Implemented | None | No monitoring or alerting to detect potential IS events. No triage process. | 🔴 High |
| A.5.26 | Response to IS incidents | ❌ Not Implemented | None | No incident response runbook or contact list. | 🔴 High |
| A.5.27 | Learning from incidents | ❌ Not Implemented | None | No post-incident review process. | 🟡 Medium |
| A.5.28 | Collection of evidence | ❌ Not Implemented | None | No evidence preservation procedure. Basic Hono request log is not forensics-grade. | 🟡 Medium |
| A.5.29 | IS during disruption | ❌ Not Implemented | None | No business continuity plan for IS during service disruption. | 🟡 Medium |
| A.5.30 | ICT readiness for BC | ❌ Not Implemented | None | No automated backups. Manual export only. No RTO/RPO defined. Relies on Cloudflare D1 durability. | 🔴 High |
| A.5.31 | Legal/regulatory compliance | 🟡 Partial | Privacy policy in docs; GDPR audit in progress | No formal compliance register. GDPR obligations not fully implemented (see GDPR audit). | 🟡 Medium |
| A.5.33 | Protection of records | 🟡 Partial | Cloudflare D1 provides some durability | No formal records retention policy. Analytics and contact data accumulate indefinitely. No backup of D1. | 🟡 Medium |
| A.5.34 | Privacy and PII | 🟡 Partial | Some PII protections (httpOnly cookies, auth protection) | Major GDPR gaps — see separate GDPR audit report (`docs/gdpr-audit.md`). | 🔴 High |
| A.5.35 | Independent IS review | ❌ Not Implemented | None | No independent security review or penetration test conducted. | 🟡 Medium |
| A.5.36 | Compliance with policies | ❌ Not Implemented | None | No IS policies exist to comply with. | 🟡 Medium |
| A.5.37 | Documented operating procedures | 🟡 Partial | CLAUDE.md, README, some inline docs | No formal security operating procedures. Deployment is undocumented manual process. | 🟡 Medium |

---

### Theme A.6 — People Controls

| Control ID | Control Name | Status | Evidence Found | Gap Notes | Priority |
|-----------|-------------|--------|---------------|-----------|----------|
| A.6.1 | Screening | N/A | Single-owner application | Not applicable — document exclusion in SoA. | N/A |
| A.6.2 | Terms and conditions | N/A | Single owner | Not applicable for sole operator. | N/A |
| A.6.3 | IS awareness & training | ❌ Not Implemented | None | No IS training records. Relevant for any contributors. | 🟢 Low |
| A.6.7 | Remote working | 🟡 Partial | Cloudflare-native deployment is inherently remote | No formal remote working IS policy. | 🟢 Low |
| A.6.8 | IS event reporting | ❌ Not Implemented | None | No process for reporting IS events to the owner/admin. | 🟡 Medium |

---

### Theme A.7 — Physical Controls

| Control ID | Control Name | Status | Gap Notes | Priority |
|-----------|-------------|--------|-----------|----------|
| A.7.1–A.7.14 | Physical controls (all) | N/A / 🟡 Partial | Deployment is Cloudflare (serverless) — physical security is Cloudflare's responsibility. Document exclusions in SoA with reference to Cloudflare's ISO 27001 certificate. | 🟢 Low |

---

### Theme A.8 — Technological Controls

| Control ID | Control Name | Status | Evidence Found | Gap Notes | Priority |
|-----------|-------------|--------|---------------|-----------|----------|
| A.8.2 | Privileged access rights | 🟡 Partial | Single admin role, `protectedProcedure` middleware | No review process for privileged access. Session tokens not revocable via UI. | 🟡 Medium |
| A.8.3 | Information access restriction | ✅ Implemented | `protectedProcedure` on all mutations; public procedures return only needed data | **Exception:** `getPage` returns admin email unnecessarily (see GDPR finding #4). | 🟡 Medium |
| A.8.4 | Access to source code | 🟡 Partial | GitHub repository (assume private or public open-source) | No branch protection rules or code review requirement documented. | 🟢 Low |
| A.8.5 | Secure authentication | ✅ Implemented | 2FA supported, magic link, httpOnly+secure cookies, rate limiting on auth endpoints | Minor gap: no edge-level middleware to block unauthenticated requests before tRPC. | 🟢 Low |
| A.8.7 | Protection against malware | 🟡 Partial | File type/MIME/size validation on uploads | No virus scanning on uploaded files. No malware scanning in CI. | 🟡 Medium |
| A.8.8 | Management of technical vulnerabilities | ❌ Not Implemented | None | No dependency vulnerability scanning (no Dependabot, Snyk, `npm audit` in CI). No CVE monitoring. | 🔴 High |
| A.8.9 | Configuration management | 🟡 Partial | Alchemy IaC for Cloudflare; environment variables validated via Zod | Default infra password `please-change-this` in `packages/infra/.env`. No hardened configuration baseline documented. | 🟡 Medium |
| A.8.10 | Information deletion | ❌ Not Implemented | Admin-only delete for contacts/blocks | No automated deletion. No data retention enforcement. No user-facing erasure mechanism. | 🔴 High |
| A.8.11 | Data masking | 🟡 Partial | Secrets masked in API responses (`------`) | Wallet cert/key **not masked** in `wallet.getConfig` response. Secrets stored as plaintext in DB. | 🟡 Medium |
| A.8.12 | Data leakage prevention | 🟡 Partial | Backup export excludes secrets; CORS locked | No DLP controls on D1/R2. Admin email leaked via `getPage`. No alerting on anomalous data access. | 🟡 Medium |
| A.8.15 | Logging | 🟡 Partial | Hono `logger()` middleware — HTTP request/response logging | No structured logging. No audit trail of admin actions (settings changes, deletions, imports). No log retention policy. | 🔴 High |
| A.8.16 | Monitoring activities | ❌ Not Implemented | None | No external monitoring (no Sentry, Datadog, Cloudflare Analytics configured). No alerting on errors or anomalies. | 🔴 High |
| A.8.17 | Clock synchronisation | ✅ Implemented | Cloudflare Workers use NTP-synchronised time | Inherited from Cloudflare infrastructure. | ✅ |
| A.8.20 | Network security | ✅ Implemented | CORS locked to `CORS_ORIGIN`; Cloudflare network protections; rate limiting | No explicit network segmentation (serverless model). | ✅ |
| A.8.21 | Security of network services | 🟡 Partial | HSTS, X-Content-Type-Options | CSP explicitly marked TODO in `next.config.ts`. Missing comprehensive security headers. | 🟡 Medium |
| A.8.23 | Web filtering | N/A | Not applicable — no corporate browsing in scope | Exclude from SoA. | N/A |
| A.8.24 | Use of cryptography | 🟡 Partial | TLS (Cloudflare), bcrypt/scrypt passwords, BETTER_AUTH_SECRET as Worker secret | No cryptography policy. Application secrets (Resend API key, CAPTCHA secret) stored as plaintext in D1. `packages/infra/.env` default password. | 🔴 High |
| A.8.25 | Secure development lifecycle | 🟡 Partial | Zod input validation, HTML stripping, URL sanitization, TypeScript strict mode | No formal SSDLC policy. Regex-based `stripHtml()` acknowledged as limited. No SAST/DAST. No security-focused code review checklist. | 🟡 Medium |
| A.8.26 | Application security requirements | 🟡 Partial | Input validation, auth protection, rate limiting built in | No formal AppSec requirements specification. CSP missing. | 🟡 Medium |
| A.8.27 | Secure system architecture | 🟡 Partial | Cloudflare-native architecture with separation of concerns | No threat model documented. No architecture security review. | 🟡 Medium |
| A.8.28 | Secure coding | 🟡 Partial | Some good practices (Zod, URL sanitization) | Regex XSS stripping is insufficient. SQL string interpolation in `scripts/reset-password.ts`. No secure coding standard documented. | 🟡 Medium |
| A.8.29 | Security testing in development | ❌ Not Implemented | Vitest for unit tests | No security-focused tests. No SAST in CI pipeline. No penetration testing. | 🔴 High |
| A.8.30 | Outsourced development | N/A | Not currently applicable | Exclude if all development is in-house. | N/A |
| A.8.31 | Separation of development environments | 🟡 Partial | `.wrangler/state` for local dev; separate D1 for prod | No formal policy separating dev/staging/prod. CI uses placeholder secrets. | 🟡 Medium |
| A.8.32 | Change management | ❌ Not Implemented | None | No formal change management process. Deployment is manual `bun deploy`. No change approval or rollback procedure. | 🟡 Medium |
| A.8.33 | Test information | 🟡 Partial | Local dev uses separate `.wrangler/state` | No policy prohibiting use of real PII in test environments. | 🟢 Low |
| A.8.34 | Protection of IS during audit | ❌ Not Implemented | None | No procedures to protect systems during audit activities. | 🟢 Low |

---

## Risk Register — Top Risks Identified

| # | Asset | Threat | Vulnerability | Likelihood | Impact | Score | Treatment |
|---|-------|--------|--------------|-----------|--------|-------|-----------|
| R1 | API keys in `site_settings` DB | Credential theft via DB access | Plaintext storage in D1 | 3 | 5 | **15** | Mitigate — encrypt or move to Worker secrets |
| R2 | Contact form PII | Unauthorised data access | No access logging, no retention limits | 3 | 4 | **12** | Mitigate — add retention policy + audit log |
| R3 | Cloudflare D1 database | Data loss | No automated backups | 2 | 5 | **10** | Mitigate — Cloudflare D1 export CRON + offsite backup |
| R4 | Dependency vulnerabilities | Supply chain attack | No dependency scanning | 3 | 4 | **12** | Mitigate — add Dependabot + `npm audit` to CI |
| R5 | Admin session | Session hijacking | No edge middleware auth, client-side redirect only | 2 | 5 | **10** | Mitigate — add Next.js `middleware.ts` for auth |
| R6 | File uploads (R2) | Malicious file upload | No virus scanning | 2 | 4 | **8** | Accept (with current MIME/size validation) or Mitigate with scanning |
| R7 | Wallet signing keys | Key exposure | Not masked in `wallet.getConfig` API response | 2 | 5 | **10** | Mitigate — apply same masking as other secrets |
| R8 | Production deployment | Undetected breach | No monitoring, no error tracking | 3 | 4 | **12** | Mitigate — integrate Sentry or Cloudflare analytics |

---

## Mandatory Documentation Checklist (ISO 27001:2022)

- [ ] ISMS Scope document (Clause 4.3)
- [ ] Information Security Policy (Clause 5.2 / A.5.1)
- [ ] Risk assessment process (Clause 6.1.2)
- [ ] Risk treatment process (Clause 6.1.3)
- [ ] Statement of Applicability / SoA (Clause 6.1.3d)
- [ ] Information security objectives (Clause 6.2)
- [ ] Evidence of competence (Clause 7.2)
- [ ] Asset inventory (A.5.9)
- [ ] Access control policy (A.5.15)
- [ ] Cryptography policy (A.8.24)
- [ ] Incident response procedure (A.5.24–5.26)
- [ ] Supplier agreements / DPAs (A.5.19–5.20)
- [ ] Business continuity / backup plan (A.5.30)
- [ ] Audit log procedure (A.8.15)
- [ ] Secure development policy (A.8.25 / A.8.28)
- [ ] Internal audit programme + results (Clause 9.2)
- [ ] Management review records (Clause 9.3)
- [ ] Nonconformities + corrective action log (Clause 10.1)

---

## Prioritised Remediation Roadmap

### Phase 1 — Immediate (Critical Security Gaps)

| # | Action | Control | Effort |
|---|--------|---------|--------|
| 1 | **Encrypt or migrate application secrets** (Resend API key, CAPTCHA secret) out of `site_settings` DB into Cloudflare Worker secrets or encrypted at-rest values | A.5.17, A.8.24 | Medium |
| 2 | **Mask wallet signing cert/key in `wallet.getConfig` API response** — apply same `------` masking as other secrets | A.8.11 | Low |
| 3 | **Add structured audit logging** for all admin actions (settings changes, data deletion, backup import) | A.8.15 | Medium |
| 4 | **Integrate monitoring/error tracking** — Sentry for Workers + Cloudflare Analytics | A.8.16, A.5.25 | Low |
| 5 | **Add dependency scanning to CI** — enable Dependabot and add `npm audit` step to `ci.yml` | A.8.8, A.5.21 | Low |
| 6 | **Implement automated D1 backup** — scheduled Cloudflare CRON Worker to export D1 to R2 | A.5.30 | Medium |
| 7 | **Document and implement data retention** — automated deletion for analytics (90d), sessions (30d) | A.8.10, A.5.33 | Medium |
| 8 | **Change default Alchemy password** in `packages/infra/.env` and document secret rotation | A.8.9, A.5.17 | Low |

### Phase 2 — Short-Term (Operational Controls)

| # | Action | Control | Effort |
|---|--------|---------|--------|
| 9 | **Write and publish Information Security Policy** | A.5.1, Clause 5.2 | Low |
| 10 | **Execute DPAs with Cloudflare and Resend** | A.5.20 | Low |
| 11 | **Document incident response procedure** | A.5.24–5.26 | Medium |
| 12 | **Implement CSP header** in `next.config.ts` | A.8.21 | Medium |
| 13 | **Add Next.js `middleware.ts`** for edge-level auth enforcement | A.5.15, A.8.5 | Low |
| 14 | **Conduct formal threat model** for application | A.8.27 | Medium |
| 15 | **Add SAST to CI pipeline** — e.g., CodeQL or Semgrep | A.8.29 | Low |

### Phase 3 — Ongoing / Best Practice

| # | Action | Control | Effort |
|---|--------|---------|--------|
| 16 | Define and document ISMS scope | Clause 4.3 | Low |
| 17 | Create formal asset inventory | A.5.9 | Low |
| 18 | Define RTO/RPO for the application | A.5.30 | Low |
| 19 | Document secure coding standards | A.8.28 | Medium |
| 20 | Replace regex-based `stripHtml()` with a proper sanitisation library | A.8.28 | Low |
| 21 | Conduct independent security review / penetration test | A.5.35 | High effort |
| 22 | Implement change management process for deployments | A.8.32 | Medium |

---

## Exclusions for Statement of Applicability (SoA)

The following controls are proposed for exclusion with justification:

| Control | Justification |
|---------|--------------|
| A.5.3 Segregation of duties | Single-operator application by design; no conflicting duties possible |
| A.6.1 Screening | No employees or contractors; sole operator |
| A.6.2 Terms of employment | No employment relationship |
| A.7.1–7.14 Physical controls (most) | Primary infrastructure is Cloudflare serverless; physical security is Cloudflare's responsibility (covered by Cloudflare's own ISO 27001 certification) |
| A.8.23 Web filtering | No corporate browsing in scope |
| A.8.30 Outsourced development | All development is in-house |

---

*See also: [GDPR Audit Report](./gdpr-audit.md) for privacy and data protection findings.*
