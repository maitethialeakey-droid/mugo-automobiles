# Mugo Automobiles: Marketplace Readiness Blockers

**Status date:** 15 August 2026  
**Scope:** This record audits every unchecked item in `todo.md` after the public catalogue, availability-enquiry safeguards, role-aware implementation, alert-delivery adapters, payment safety boundary, and source synchronization were validated.

> **Release safety boundary:** Public catalogue browsing and availability enquiries are live. Payment capture is intentionally disabled. No notification provider or payment provider is treated as configured until its authenticated merchant credentials, sender identity, and applicable verification controls have been supplied and validated.

## Verified safe work already complete

The storefront is reachable on the managed production domain. The current source archive was committed to the public repository as `2f2cc70`, and GitHub Actions run **#12** completed the source expansion successfully. The local release validation completed with **35 tests across 10 files passing**, no TypeScript errors, and a successful production build. The public enquiry path has both a privacy-preserving honeypot and a bounded, process-local rate limiter; the production-scaling limitation is documented in `public-enquiry-rate-limit.md`.

| Safe capability | Evidence | Current boundary |
| --- | --- | --- |
| Public Kenya catalogue and enquiry UX | `Home.tsx`, `Home.enquiry.test.tsx`, `public-inquiry-verification.md` | Visitors may browse without signing in and can submit an availability request after providing email or phone contact details. |
| Abuse safeguards | `marketplace.ts`, `marketplace.test.ts`, `public-enquiry-rate-limit.md` | Bot-filled honeypot submissions are rejected; public enquiries are bounded to four per client per ten minutes in each application process. |
| Role-aware dashboard implementation | `AdminDashboard.tsx`, `AdminDashboard.test.tsx`, `staffAccess.ts` | UI and server procedures enforce the established five-role model, but real acceptance testing requires an authorized staff account. |
| Alert delivery foundation | `alertDelivery.ts`, `scheduledAlerts.ts`, `alertDelivery.test.ts` | In-app scans and provider-safe adapters exist; no external message is sent until verified credentials and sender identities are configured. |
| Payment safety boundary | `paymentIntegration.ts`, `paymentIntegration.test.ts`, `releaseInfo.ts` | All payment rails remain inactive; verified PayPal webhook receipt handling does not enable capture or order-state processing. |

## Remaining items and their external dependencies

Every remaining unchecked task is blocked by at least one of three non-code prerequisites: **credentials**, **authorized access**, or **explicit business approval**. No safe implementation work has been deferred solely for convenience.

| Open task | Blocking category | Exact prerequisite | Why it cannot be completed safely without it | Safe status today |
| --- | --- | --- | --- | --- |
| Authenticated acceptance checks for role-specific routes and protected actions | Authorized access | A real owner or staff session for each relevant role, or owner-authorized test accounts | The production database and OAuth identities must not be impersonated or role-elevated without authority. | Procedure and rendered UI tests cover the permission model. |
| Scheduled buyer alerts and live payment-provider reconciliation | Credentials and approval | Configured delivery-provider credentials plus merchant-approved payment rails | A live scan may send messages or process payment events; both actions require legitimate provider configuration and business authorization. | Daily scan and inactive reconciliation contracts are implemented. |
| Owner-session acceptance testing for uploads, listing modal, sidebar, buyer tabs, and order actions | Authorized access | Owner session with permitted test records and storage access | Exercising mutations against real inventory, documents, or orders requires the authorized account holder. | Responsive rendering checks and automated coverage are complete. |
| SendGrid configuration | Credentials | SendGrid API key and a verified sender identity for `maitethialeakey@gmail.com` | Sender verification and secret storage must be completed in the owner-controlled SendGrid account. | Adapter rejects incomplete or placeholder configuration. |
| Africa's Talking configuration | Credentials and provider approval | Africa's Talking username, API key, approved `MUGOAUTO` sender ID, and protected recipient configuration | SMS sender identities are provider-controlled and account secrets must never be committed or entered into chat. | Adapter and delivery-routing tests are complete. |
| Email and SMS delivery validation | Credentials | Working SendGrid and Africa's Talking configuration, including approved identities | A successful test requires sending real provider requests and verifying delivery responses. | Idempotent delivery-record persistence is implemented. |
| Owner SMS recipient configuration | Authorized configuration | Owner-approved recipient stored as protected server configuration | A personal recipient must be set by the owner through secure configuration, not hard-coded or exposed in source. | Recipient routing is isolated from frontend code. |
| Webhook signature verification before payment-event processing | Credentials and provider specification | Merchant-approved webhook secrets and confirmed providers for M-Pesa, Airtel Money, Payoneer, and crypto processor | Signature verification must match each provider's actual signed payload rules and secret material. | Unknown, unverified, duplicate, and inactive events are rejected or kept non-processing; PayPal verification adapter is present. |
| Merchant-approved payment configuration | Credentials and approval | Legitimate merchant accounts, rail configuration, compliance decisions, and named crypto processor | Capturing funds or reconciling payment status cannot be activated without ownership, compliance, and merchant authorization. | Provider-neutral intent and receipt models are present; capture is disabled. |
| Provider-specific webhook verification | Credentials and provider specification | Confirmed provider selection and appropriate webhook-secret material for each approved rail | It is unsafe to guess signatures, endpoints, or payload semantics. | Shared inactive receipt controls are implemented. |
| Sandbox payment and reconciliation acceptance checks | Credentials and approval | Sandbox accounts and merchant permission for each configured provider | These checks need provider-controlled sandbox credentials and test funds/events. | No live capture can occur while rails are inactive. |
| Final live-capture activation | Explicit business approval | Written approval for each rail after sandbox validation, merchant configuration, and compliance review | Enabling payment capture is a consequential commercial action and must remain owner-approved. | `paymentCaptureEnabled` remains `false`. |
| Kenya catalogue template staging | Authorized access | Real authenticated inventory staff session | Staging writes 180 draft templates to the managed database; it must be performed by authorized inventory staff. | Public browsing reflects availability-pending templates only; publication is guarded. |
| Catalogue staging-panel acceptance check | Authorized access | Authenticated inventory staff browser session after staging | This validates the real staff UX and publication safeguards without bypassing access controls. | Component-level and preview evidence exists in `dashboard-catalogue-verification.md`. |

## Completion sequence once prerequisites are available

The correct next sequence is to configure alert providers through protected server secrets, validate a controlled delivery to approved targets, establish merchant sandbox settings and provider-specific signature verification, run sandbox reconciliation checks, and obtain explicit per-rail activation approval before enabling any live capture. Separately, an owner must authorize or conduct staff-session acceptance checks and stage the 180 catalogue templates as drafts. This sequence preserves the current public browsing experience while avoiding unauthorized database writes, messaging, or financial processing.

## Conclusion

All remaining items are externally dependent. The project is therefore **safe-readiness complete** for the current no-live-payment launch boundary: browsing, catalogue discovery, availability enquiries, role-aware software controls, source synchronization, and automated validation are in place. Completion of the open tasks requires external credentials, an authorized staff/owner session, provider approval, or explicit merchant activation authorization.
