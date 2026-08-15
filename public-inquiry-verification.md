# Public Availability Enquiry Verification

The public Mugo Automobiles homepage rendered without an authenticated session after the availability-enquiry workflow was added. The homepage remained publicly browsable and exposed the **Browse 180 Kenya models** entry point.

The public catalogue was opened without sign-in and displayed **184 models and arrivals**, an explicit availability-pending disclosure, and **Check availability** controls on catalogue templates. The remaining interactive check is to confirm that the availability enquiry modal requests a name, message, and at least one response channel before submission.

The availability interaction was then rechecked directly in the rendered public page. The no-sign-in **Check availability** control opened an **Availability request** dialog for a Toyota Land Cruiser Prado template. The dialog identifies the record as a Kenya sourcing catalogue entry, requires a name and message, provides email and phone response fields, and states that at least one response channel is required before an enquiry can be sent.

Direct browser-style UI coverage in `Home.enquiry.test.tsx` now opens the Kenya catalogue, opens the availability modal, checks every required field, and verifies the response-channel validation message. The full suite passes with 32 tests, together with TypeScript and production-build validation.

Final browser verification captured the rendered public **Availability request** modal on an availability-pending Toyota Land Cruiser Prado card. The capture shows the required **Your name**, **Email**, **Phone**, and enquiry-message fields alongside the **Send enquiry** control, while the page remains unauthenticated and no real customer enquiry was submitted.
