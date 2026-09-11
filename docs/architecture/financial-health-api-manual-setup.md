# Financial Health API manual setup

## AWS resources

- Region: `ap-southeast-2`
- Lambda: `FinancePilotFinancialHealthApi`
- Runtime: Node.js 20.x
- Handler: `index.handler`
- DynamoDB table: `FinancePilotFinancialHealthScores`
- Partition key: `userId` (String)
- Sort key: `scoreId` (String)
- Billing: On-demand

The Lambda stores the latest result with `scoreId=current`. The sort key leaves room for scheduled historical snapshots later without changing the table design.

## Lambda environment

```text
TRANSACTIONS_TABLE=FinancePilotTransactions
BUDGETS_TABLE=FinancePilotBudgets
SAVINGS_GOALS_TABLE=FinancePilotSavingsGoals
SUBSCRIPTIONS_TABLE=FinancePilotSubscriptions
HEALTH_SCORES_TABLE=FinancePilotFinancialHealthScores
ALLOWED_ORIGINS=http://localhost:5173,https://d3q58tmz0hee61.cloudfront.net
```

## IAM permissions

Grant the Lambda role:

- `dynamodb:Query` on `FinancePilotTransactions`
- `dynamodb:Query` on `FinancePilotBudgets`
- `dynamodb:Query` on `FinancePilotSavingsGoals`
- `dynamodb:Query` on `FinancePilotSubscriptions`
- `dynamodb:PutItem` on `FinancePilotFinancialHealthScores`
- Standard CloudWatch Logs permissions

Scope each DynamoDB permission to its exact table ARN.

## API Gateway

Add `GET /financial-health` to `FinancePilotApi`, integrate it with `FinancePilotFinancialHealthApi`, and attach the existing `FinancePilotCognitoAuthorizer` JWT authorizer.

The Lambda derives `userId` only from `event.requestContext.authorizer.jwt.claims.sub`. It does not accept a user ID from the browser.

## Deterministic score

The score totals 100 points:

- Cash flow: 35 points
- Budget adherence: 25 points
- Savings progress: 25 points
- Recurring-cost load: 15 points

Transfers do not affect cash flow. Recurring weekly, quarterly, and yearly costs are normalized to monthly values. Missing sections receive a neutral baseline and are marked `notEnoughData`; the response also reports `limited`, `partial`, or `complete` data status.

No external credit data or hidden weighting is used.
