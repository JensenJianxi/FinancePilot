# FinancePilot P0 Access Patterns

This document captures the current P0 assumptions for the eventual DynamoDB
design. It is intentionally provisional and should not be treated as the final
database schema.

## 1. Known API Use Cases

### Transactions

- list transactions for the authenticated user
- list transactions by month or date range
- get transaction by ID
- filter transactions by category
- filter transactions by payment method
- create transaction
- update transaction
- delete transaction

### Categories

- list system/default categories
- list user custom categories
- get category by ID
- create custom category
- update custom category
- delete custom category

### Budgets

- list user budgets for a month
- get budget by category and period
- get budget by ID
- create budget
- update budget
- delete budget

### Savings Goals

- list active savings goals
- get goal by ID
- create goal
- update goal
- delete goal

### Subscriptions

- list subscriptions
- get subscription by ID
- find upcoming renewals
- create subscription
- update subscription
- delete subscription

### Dashboard

- retrieve the dashboard summary efficiently for the authenticated user
- retrieve recent transactions for the dashboard
- retrieve active budgets for the current month
- retrieve active goals
- retrieve subscriptions with upcoming renewals
- retrieve the latest health score data

### Supporting Entities

- retrieve current user profile
- list notification records for the authenticated user
- retrieve health score history

## 2. Candidate DynamoDB Access Patterns

These are the access patterns FinancePilot should optimize first.

### User-centric reads

- fetch all core finance objects for one authenticated user
- fetch a single object owned by one authenticated user
- list objects of one type owned by one authenticated user

### Time-oriented reads

- list transactions for a user ordered by date
- list subscriptions ordered by renewal date
- list scores ordered by generated date

### Lookup and filtering reads

- filter transactions by category within one user
- filter transactions by payment method within one user
- find budgets by user + period
- find budget by user + category + period

## 3. Candidate PK/SK Design

This is a recommendation only. It is not final.

### Candidate partition key

- `PK = USER#<userId>`

Why:

- every private read is user-scoped
- aligns with the future Cognito `sub` ownership model
- reduces the chance of cross-user leakage

### Candidate sort key families

- `SK = PROFILE#<userId>`
- `SK = TXN#<date>#<transactionId>`
- `SK = CATEGORY#<scope>#<categoryId>`
- `SK = BUDGET#<periodMonth>#<categoryId>`
- `SK = GOAL#<goalId>`
- `SK = SUBSCRIPTION#<renewalDate>#<subscriptionId>`
- `SK = NOTIFICATION#<scheduledFor>#<notificationId>`
- `SK = SCORE#<calculatedAt>#<scoreId>`

This candidate keeps user ownership explicit while still allowing ordered reads
within a user partition.

## 4. Candidate GSIs

These GSIs are candidates only and need validation against real query volume and
response-shape needs.

### Candidate GSI 1: entity type listing

- `GSI1PK = USER#<userId>#<entityType>`
- `GSI1SK = <sortable secondary key>`

Possible uses:

- list all user subscriptions ordered by renewal date
- list all user goals

### Candidate GSI 2: category-based transaction filtering

- `GSI2PK = USER#<userId>#CATEGORY#<categoryId or categoryName>`
- `GSI2SK = <transactionDate>#<transactionId>`

Possible uses:

- filter transactions by category
- support category analysis without scanning the whole partition

### Candidate GSI 3: payment method transaction filtering

- `GSI3PK = USER#<userId>#PAYMENT#<paymentMethod>`
- `GSI3SK = <transactionDate>#<transactionId>`

Possible uses:

- filter transactions by payment method

### Candidate GSI 4: month-based budget lookup

- `GSI4PK = USER#<userId>#BUDGET#<periodMonth>`
- `GSI4SK = <categoryId>`

Possible uses:

- list budgets for the current month
- efficiently build budget sections in the dashboard

## 5. Assumptions Still Needing Validation

- whether a single-table design is actually the best fit once real dashboard
  queries and write paths are implemented
- whether category filtering should use category IDs, names, or both
- whether transactions need a month-specific secondary index in addition to
  date-ordered sort keys
- whether dashboard reads should come from direct queries or a future
  precomputed read model
- whether notifications and health scores should share the same table as
  primary finance records
- whether system categories should live in the same table as user categories or
  be managed separately
- whether subscription renewals require a dedicated GSI or can be served from a
  general entity-type index

## Current Decision

No DynamoDB table shape is finalized in P0.1 or P0.2.

The current repository only records the access-pattern requirements and a
candidate key strategy so the eventual P0.5 implementation can be evaluated
against real use cases before infrastructure is locked in.
