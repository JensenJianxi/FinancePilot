# FinancePilot Transactions API Manual AWS Setup

This guide covers the first real backend vertical slice for FinancePilot:
transactions only.

Current scope:

- authenticated frontend calls
- Cognito JWT bearer token
- API Gateway HTTP API routes
- Lambda transactions handler
- DynamoDB transaction persistence

Out of scope for this step:

- budgets
- savings goals
- subscriptions
- AI
- OCR
- notifications delivery

## 1. Create the DynamoDB Table

Create a table named:

- `FinancePilotTransactions-dev`

Keys:

- partition key: `userId` (`String`)
- sort key: `transactionId` (`String`)

Expected item shape:

```json
{
  "userId": "cognito-sub",
  "transactionId": "txn_123",
  "type": "expense",
  "title": "Lunch at office",
  "amount": 24.5,
  "category": "Food",
  "paymentMethod": "Card",
  "transactionDate": "2026-08-18",
  "note": "Team lunch",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "updatedAt": "2026-08-18T12:00:00.000Z"
}
```

## 2. Create the Lambda Function

Use the `@finance-pilot/api` build output as the source for the handler.

Handler entrypoint:

- `dist/functions/index.handler`

The handler expects:

- HTTP API event shape
- Cognito JWT claims in `event.requestContext.authorizer.jwt.claims`

## 3. Add Lambda Environment Variables

Set:

```env
TRANSACTIONS_TABLE=FinancePilotTransactions-dev
ALLOWED_ORIGINS=http://localhost:5173,https://d3q58tmz0hee61.cloudfront.net
FINANCE_PILOT_STAGE=dev
```

## 4. Grant Lambda DynamoDB Permissions

The Lambda role needs at minimum:

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`

Resource:

- the `FinancePilotTransactions-dev` table ARN

## 5. Create the API Gateway HTTP API

Create an HTTP API and wire the Lambda transactions handler to these routes:

- `GET /transactions`
- `POST /transactions`
- `GET /transactions/{transactionId}`
- `PATCH /transactions/{transactionId}`
- `DELETE /transactions/{transactionId}`

## 6. Add the Cognito JWT Authorizer

Configure a JWT authorizer with:

- region: `us-east-1`
- user pool: `us-east-1_SYGsozQwH`
- app client ID audience: `4ssgp78mbqsmah9093augi3dkh`

The backend uses:

- `claims.sub` as the `userId`

The frontend must never send `userId` in the body.

## 7. Enable CORS

Allow these origins:

- `http://localhost:5173`
- `https://d3q58tmz0hee61.cloudfront.net`

Allow headers:

- `Authorization`
- `Content-Type`

Allow methods:

- `GET`
- `POST`
- `PATCH`
- `DELETE`
- `OPTIONS`

## 8. Point the Frontend at the API

Set the real API URL in:

- `apps/web/.env.local`

```env
VITE_API_BASE_URL=https://your-http-api-id.execute-api.us-east-1.amazonaws.com
```

If `VITE_API_BASE_URL` is not set, the transactions UI falls back to the
existing mock/local behavior.

## 9. Rebuild the Frontend

Run:

- `pnpm --filter @finance-pilot/web build`

## 10. Upload the Frontend Build

Upload the `apps/web/dist` output to the S3 bucket that backs CloudFront.

## 11. Invalidate CloudFront

Invalidate the distribution after the upload so the new frontend reads the API
base URL and transactions client changes immediately.

## 12. Smoke Test

Confirm this end-to-end path works:

1. Sign in through FinancePilot.
2. Open Expenses.
3. Add a transaction.
4. Confirm the request includes the Cognito bearer token.
5. Confirm Lambda stores the item under the authenticated user's `sub`.
6. Refresh the page.
7. Confirm `GET /transactions` returns the saved item for that same user only.
