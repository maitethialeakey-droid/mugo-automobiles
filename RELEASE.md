# Mugo Automobiles Release Record

## Alert Delivery Routing Build

| Field | Recorded value |
| --- | --- |
| Release identity | `alert-delivery-routing-v1` |
| Managed release checkpoint | `822b876d` |
| Backend release signal | `/api/release` |
| Public release artifact | `/release.json` and `client/public/release.json` |
| Payment capture state | Disabled |

This release adds explicit SendGrid email and Africa’s Talking SMS alert-routing targets with idempotent delivery-record persistence. Provider credentials remain unconfigured, so no external email, SMS, payment capture, or payment reconciliation action is enabled by this release.

The source-controlled public artifact is tested to match the backend release metadata. The separate owner acceptance checks and provider-specific production activation checks remain tracked in `todo.md`.
