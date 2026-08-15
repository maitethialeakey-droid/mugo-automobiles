# Public Enquiry Rate Limiting

Public availability enquiries use a **best-effort, process-local** rate limit of four submissions per client IP address in a rolling ten-minute window. Expired buckets are removed every time the guard runs, and the tracked-client map is bounded at 5,000 entries so it cannot grow indefinitely within one application process.

The guard is intentionally an early protection layer: it reduces automated form pressure before a request reaches the database. It is not a substitute for perimeter controls. On a multi-instance deployment, each running instance keeps its own short-lived buckets and a restart resets the local window. If traffic volume or abuse risk warrants shared enforcement, the next upgrade should place a trusted proxy or a shared store such as Redis in front of the procedure; no shared external rate-limit service is configured yet.
