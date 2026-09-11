# FinancePilot

FinancePilot is a responsive personal-finance web app for recording expenses,
tracking monthly budgets, monitoring subscriptions, and following savings goals.
It is built as an installable Progressive Web App (PWA) and backed by AWS
serverless services.

## Live Website

[Open FinancePilot](https://financepilothq.com)

## How To Use FinancePilot

1. Open the live website and create an account.
2. Confirm your email, then sign in.
3. Select the add button to record a transaction. The receipt-scanning shortcut
   can be disabled under **More**, which opens manual entry immediately.
4. Enter a transaction title and FinancePilot will suggest a matching category.
   For example, `refuel` maps to Transport and `cinema` maps to Entertainment.
5. Use **Expenses** to review the current month, filter and sort transactions,
   inspect category totals, edit entries, and open previous monthly history.
6. Use **Budget** to create monthly or one-time spending limits, track savings
   goals, and manage recurring subscriptions.
7. Use **More** to change the theme, animation preferences, transaction defaults,
   receipt scanning, and budget-creation controls.

On iPhone or iPad, use **Share > Add to Home Screen** to install FinancePilot as
an app.

## Features

- Cognito account registration, email confirmation, sign-in, and password reset
- Current-month spending dashboard and budget progress
- Transaction creation, editing, deletion, filtering, sorting, and history
- Keyword-based automatic expense category suggestions
- Monthly and one-time budgets
- Savings goals and recurring subscription tracking
- User-configurable defaults, theme, animations, and feature controls
- Mobile-first interface with PWA installation and offline static-asset caching
- Authenticated API routes with user-scoped DynamoDB records

## Technology

- React 19, TypeScript, Vite, React Router, TanStack Query, and Zod
- Node.js 20 Lambda handlers
- Amazon Cognito, API Gateway, Lambda, DynamoDB, S3, and CloudFront
- AWS CDK infrastructure definitions
- pnpm workspaces

## Repository Structure

```text
apps/web        React PWA frontend
apps/api        API and Lambda business logic
packages/shared Shared contracts and validation schemas
infra/cdk       AWS CDK infrastructure
docs            Architecture and manual setup notes
```

## Local Development

### Requirements

- Node.js 20 or newer
- pnpm 10.30.1 or newer

### Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
```

Set the Cognito and API values in `apps/web/.env.local`, then start the API and
web app in separate terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

Open [http://localhost:5173](http://localhost:5173).

The frontend uses these primary values:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API Gateway or local API base URL |
| `VITE_AWS_REGION` | Region containing the Cognito user pool |
| `VITE_COGNITO_USER_POOL_ID` | Cognito user-pool ID |
| `VITE_COGNITO_APP_CLIENT_ID` | Cognito app-client ID |
| `VITE_SITE_URL` | Public website URL used for generated metadata |

Never commit `.env.local`, browser session files, AWS credentials, or generated
deployment packages.

## Verification

Run the complete project checks before creating a release:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm cdk:synth
```

The production frontend is generated in `apps/web/dist`.

## AWS Deployment

The CDK workspace contains the S3 and CloudFront hosting stack plus data-stack
definitions. The Lambda handlers under `apps/api/src/functions` support the
transactions, categories, budgets, subscriptions, savings goals, settings, and
financial-health API routes.

Custom-domain deployment uses these values:

- `FINANCE_PILOT_WEB_DOMAIN`
- `FINANCE_PILOT_HOSTED_ZONE_NAME`
- `FINANCE_PILOT_HOSTED_ZONE_ID`
- `FINANCE_PILOT_CERTIFICATE_ARN`

For CloudFront, the ACM certificate must be issued in `us-east-1`.
