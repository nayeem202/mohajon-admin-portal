# Mohajon Admin Portal

The internal operations portal for **Mohajon**, a smart shop-management
platform for Bangladeshi small businesses. It gives authorized platform staff a
single place to monitor operations, reconcile subscriptions, manage releases,
and respond to customer-support requests.

## Core capabilities

- Secure platform-administrator sign-in and session refresh
- Platform overview with shops, subscriptions, and operational metrics
- bKash subscription-payment reconciliation against the provider's current state
- Central support inbox for shop-owner conversations
- Platform notifications and application-update management
- Administrative visibility without granting access through a shop-level role

## Architecture

```text
Angular 22 single-page application
              │
              ├── Mohajon Auth Service :8080
              └── Mohajon Core Service :8081
```

The portal is a presentation layer only. Authentication, authorization,
payment-state verification, and data-access rules are enforced by the backend.

## Technology

| Area | Choice |
|---|---|
| Framework | Angular 22, TypeScript 6 |
| UI | Standalone Angular components, SCSS |
| State & API | Angular signals and `HttpClient` |
| Tooling | Angular CLI, Vitest, Prettier, npm |

## Run locally

### Prerequisites

- Node.js 22.22 or later
- npm 10.9 or later
- Running local instances of Mohajon Auth Service and Mohajon Core Service

### Commands

```bash
npm ci
npm start
```

The development server is started by Angular CLI. Use the local service URLs in
`public/runtime-config.js` when working against a local backend.

## Runtime configuration

The portal reads service URLs from `public/runtime-config.js` at startup, so the
same production build can be deployed to multiple environments without a
rebuild.

```js
window.__MOHAJON_ADMIN_CONFIG__ = {
  authBaseUrl: 'https://auth.example.com',
  apiBaseUrl: 'https://api.example.com',
};
```

Use HTTPS in production. Do not add credentials, API keys, or private admin IDs
to this client-side file.

## Administrator access

The core service decides who may use this portal. Configure allowed global
account IDs server-side:

```bash
PLATFORM_ADMIN_USER_IDS=global-admin-user-id
```

Multiple IDs may be comma-separated. A shop-level `ADMIN` role alone does not
grant platform-portal access.

## Quality checks and production build

```bash
npm test
npm run build
```

`npm run build` creates the deployable production bundle. Payment
reconciliation deliberately verifies bKash status instead of exposing a manual
"mark paid" action.

## Related repositories

- `mohajon-auth-service` — platform identity and token issuance
- `mohajon-core-service` — authorization and operational business APIs
- `mohajon-mobile-app` — customer-facing mobile client
