import { financeWorkspaceSnapshotDtoSchema, type FinanceWorkspaceSnapshotDto } from "../index";

const mockWorkspaceSnapshotValue = financeWorkspaceSnapshotDtoSchema.parse({
  user: {
    id: "user_001",
    email: "jensen@example.com",
    emailVerified: true,
    fullName: "Jensen Jianxi"
  },
  summary: {
    currentBalance: 24850,
    healthScore: 84,
    monthlyExpense: 6420,
    monthlyIncome: 10200,
    savingsRate: 37,
    spendingSummary:
      "Cash flow is stable, but dining and subscriptions are climbing faster than income growth.",
    upcomingBills: 4,
    userDisplayName: "Jensen"
  },
  transactions: [
    {
      id: "txn_001",
      title: "Monthly Salary",
      amount: 9200,
      category: "Salary",
      date: "2026-08-01",
      type: "income",
      paymentMethod: "Bank Transfer",
      notes: "Base salary for August"
    },
    {
      id: "txn_002",
      title: "Apartment Rent",
      amount: 2200,
      category: "Bills",
      date: "2026-07-29",
      type: "expense",
      paymentMethod: "Auto Debit",
      notes: "Monthly rent payment"
    },
    {
      id: "txn_003",
      title: "Groceries",
      amount: 260,
      category: "Food",
      date: "2026-07-28",
      type: "expense",
      paymentMethod: "Card",
      notes: "Weekly supermarket run"
    },
    {
      id: "txn_004",
      title: "Freelance Project",
      amount: 1000,
      category: "Investment",
      date: "2026-07-26",
      type: "income",
      paymentMethod: "Bank Transfer",
      notes: "Side project milestone"
    },
    {
      id: "txn_005",
      title: "Streaming Bundle",
      amount: 79,
      category: "Entertainment",
      date: "2026-07-24",
      type: "expense",
      paymentMethod: "Card",
      notes: "Recurring annualized monthly share"
    }
  ],
  categories: [
    { id: "cat_food", isDefault: true, name: "Food", type: "expense" },
    { id: "cat_transport", isDefault: true, name: "Transport", type: "expense" },
    { id: "cat_shopping", isDefault: true, name: "Shopping", type: "expense" },
    { id: "cat_bills", isDefault: true, name: "Bills", type: "expense" },
    { id: "cat_salary", isDefault: true, name: "Salary", type: "income" },
    { id: "cat_investment", isDefault: true, name: "Investment", type: "income" },
    { id: "cat_healthcare", isDefault: true, name: "Healthcare", type: "expense" }
  ],
  budgets: [
    { id: "bud_001", category: "Food", limit: 900, periodMonth: "2026-08", recurrence: "once", scope: "category", spent: 620, trend: "healthy" },
    { id: "bud_002", category: "Transport", limit: 500, periodMonth: "2026-08", recurrence: "once", scope: "category", spent: 460, trend: "watch" },
    { id: "bud_003", category: "Shopping", limit: 700, periodMonth: "2026-08", recurrence: "once", scope: "category", spent: 780, trend: "over" },
    { id: "bud_004", category: "Entertainment", limit: 350, periodMonth: "2026-08", recurrence: "once", scope: "category", spent: 240, trend: "healthy" }
  ],
  savingGoals: [
    {
      id: "goal_001",
      name: "Emergency Fund",
      targetAmount: 18000,
      currentAmount: 12600,
      deadline: "2027-02-01",
      monthlyContribution: 900,
      predictedCompletion: "2027-01-15"
    },
    {
      id: "goal_002",
      name: "Japan Trip",
      targetAmount: 8500,
      currentAmount: 4300,
      deadline: "2027-06-01",
      monthlyContribution: 500,
      predictedCompletion: "2027-04-21"
    }
  ],
  subscriptions: [
    {
      active: true,
      amount: 55,
      autoCreateTransaction: false,
      categoryId: "cat_bills",
      categoryName: "Bills",
      createdAt: "2026-08-01T08:00:00.000Z",
      frequency: "monthly",
      id: "sub_001",
      name: "Netflix",
      nextPaymentDate: "2026-09-01",
      paymentMethod: "Card",
      updatedAt: "2026-08-01T08:00:00.000Z"
    },
    {
      active: false,
      amount: 138,
      autoCreateTransaction: false,
      categoryId: "cat_bills",
      categoryName: "Bills",
      createdAt: "2026-08-02T08:00:00.000Z",
      frequency: "monthly",
      id: "sub_002",
      name: "Adobe Creative Cloud",
      nextPaymentDate: "2026-09-11",
      paymentMethod: "Card",
      updatedAt: "2026-08-02T08:00:00.000Z"
    },
    {
      active: true,
      amount: 120,
      autoCreateTransaction: false,
      categoryId: "cat_healthcare",
      categoryName: "Healthcare",
      createdAt: "2026-08-03T08:00:00.000Z",
      frequency: "monthly",
      id: "sub_003",
      name: "Gym Membership",
      nextPaymentDate: "2026-09-16",
      paymentMethod: "Card",
      updatedAt: "2026-08-03T08:00:00.000Z"
    }
  ],
  scores: [
    {
      id: "score_001",
      score: 76,
      calculatedAt: "2026-03-01T00:00:00.000Z",
      dataStatus: "complete",
      periodMonth: "2026-03",
      rating: "steady",
      factors: [
        { key: "cashFlow", label: "Cash flow", maxScore: 35, score: 27, status: "healthy", summary: "Income is covering monthly spending." },
        { key: "budgetAdherence", label: "Budgets", maxScore: 25, score: 19, status: "healthy", summary: "Most budgets remain within their limits." },
        { key: "savingsProgress", label: "Savings", maxScore: 25, score: 18, status: "healthy", summary: "Savings goals are moving forward." },
        { key: "recurringCostLoad", label: "Recurring costs", maxScore: 15, score: 12, status: "strong", summary: "Recurring costs are manageable." }
      ]
    },
    {
      id: "score_002",
      score: 79,
      calculatedAt: "2026-04-01T00:00:00.000Z",
      dataStatus: "complete",
      periodMonth: "2026-04",
      rating: "steady",
      factors: [
        { key: "cashFlow", label: "Cash flow", maxScore: 35, score: 29, status: "strong", summary: "Income is comfortably covering monthly spending." },
        { key: "budgetAdherence", label: "Budgets", maxScore: 25, score: 20, status: "strong", summary: "Budget spending is controlled." },
        { key: "savingsProgress", label: "Savings", maxScore: 25, score: 18, status: "healthy", summary: "Savings goals are moving forward." },
        { key: "recurringCostLoad", label: "Recurring costs", maxScore: 15, score: 12, status: "strong", summary: "Recurring costs are manageable." }
      ]
    },
    {
      id: "score_003",
      score: 84,
      calculatedAt: "2026-08-01T00:00:00.000Z",
      dataStatus: "complete",
      periodMonth: "2026-08",
      rating: "strong",
      factors: [
        { key: "cashFlow", label: "Cash flow", maxScore: 35, score: 31, status: "strong", summary: "Income is comfortably covering monthly spending." },
        { key: "budgetAdherence", label: "Budgets", maxScore: 25, score: 21, status: "strong", summary: "Budget spending is controlled." },
        { key: "savingsProgress", label: "Savings", maxScore: 25, score: 19, status: "healthy", summary: "Savings goals are moving forward." },
        { key: "recurringCostLoad", label: "Recurring costs", maxScore: 15, score: 13, status: "strong", summary: "Recurring costs are manageable." }
      ]
    }
  ],
  analytics: {
    monthlyCashFlow: [
      { label: "Mar", income: 9800, expense: 6500, savings: 3300 },
      { label: "Apr", income: 10050, expense: 6120, savings: 3930 },
      { label: "May", income: 10120, expense: 6700, savings: 3420 },
      { label: "Jun", income: 10350, expense: 6310, savings: 4040 },
      { label: "Jul", income: 10200, expense: 6420, savings: 3780 },
      { label: "Aug", income: 10480, expense: 6180, savings: 4300 }
    ],
    healthScoreTrend: [
      { label: "Mar", score: 76 },
      { label: "Apr", score: 79 },
      { label: "May", score: 78 },
      { label: "Jun", score: 81 },
      { label: "Jul", score: 84 },
      { label: "Aug", score: 86 }
    ],
    categoryBreakdown: [
      { name: "Bills", value: 34 },
      { name: "Food", value: 21 },
      { name: "Transport", value: 12 },
      { name: "Shopping", value: 18 },
      { name: "Entertainment", value: 8 },
      { name: "Healthcare", value: 7 }
    ]
  },
  notifications: [
    {
      id: "not_001",
      title: "Netflix renews in 5 days",
      scheduledFor: "2026-08-06T09:00:00.000Z",
      channel: "push",
      read: false
    },
    {
      id: "not_002",
      title: "Shopping budget exceeded",
      scheduledFor: "2026-07-30T18:00:00.000Z",
      channel: "email",
      read: true
    }
  ]
});

export function createMockWorkspaceSnapshot(): FinanceWorkspaceSnapshotDto {
  return structuredClone(mockWorkspaceSnapshotValue);
}

export const financeSnapshot = createMockWorkspaceSnapshot();
