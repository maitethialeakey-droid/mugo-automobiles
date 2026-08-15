# MUGO AUTOMOBILES

This is a **standalone source copy** of the approved Mugo Automobiles vehicle-marketplace experience. It preserves the Nairobi Atelier storefront, authentication-aware buyer and seller journeys, staff-role controls, inventory management, payment safety boundary, and alert-delivery foundations from the validated reference implementation.

The project uses React, Tailwind CSS, Express, tRPC, Drizzle, and Manus OAuth. It deliberately retains the inactive payment-capture boundary: merchant credentials, webhook verification, sandbox validation, and explicit approval are required before any provider can process money.

## Local development

Install project dependencies with `pnpm install`, then start the development service with `pnpm dev`. Run `pnpm test` before release. The full stack requires the same managed environment variables as the reference project for database, authentication, storage, and optional delivery providers.

## Source synchronization

The next validated source archive will be synchronized to the user-approved GitHub repository using the established repository workflow. This standalone copy does not modify the currently published Mugo Automobiles project.
