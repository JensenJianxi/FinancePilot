import type { Transaction } from "@finance-pilot/shared";

type TransactionLike = Pick<Transaction, "amount" | "date" | "type"> & {
  createdAt?: string;
};

const spendingTitleAliases = [
  { keywords: ["refuel", "fuel", "petrol", "diesel"], title: "Refuel" },
  { keywords: ["movie", "movies", "cinema", "film"], title: "Movies" },
  { keywords: ["tng", "tng topup", "touch n go", "touch n go topup"], title: "TNG Topup" }
] as const;

function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesTitleKeyword(title: string, keyword: string) {
  return ` ${title} `.includes(` ${normalizeTitle(keyword)} `);
}

function getSpendingTitleGroup(title: string) {
  const normalizedTitle = normalizeTitle(title);
  const alias = spendingTitleAliases.find((candidate) =>
    candidate.keywords.some((keyword) => includesTitleKeyword(normalizedTitle, keyword))
  );

  if (alias) {
    return { key: normalizeTitle(alias.title), title: alias.title };
  }

  const trimmedTitle = title.trim().replace(/\s+/g, " ");
  return {
    key: normalizedTitle,
    title: trimmedTitle ? `${trimmedTitle[0]?.toUpperCase()}${trimmedTitle.slice(1)}` : "Other"
  };
}

export function compareTransactions<T extends { date: string; createdAt?: string }>(a: T, b: T) {
  const dateDifference = new Date(b.date).getTime() - new Date(a.date).getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  if (a.createdAt && b.createdAt) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  return 0;
}

export function groupTransactionsByMonth(transactions: Transaction[]) {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach((transaction) => {
    const month = new Date(transaction.date).toLocaleString("en-MY", {
      month: "long",
      year: "numeric"
    });

    const existing = grouped.get(month) ?? [];
    existing.push(transaction);
    grouped.set(month, existing);
  });

  return Array.from(grouped.entries());
}

export function getCurrentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isTransactionInMonth(transactionDate: string, monthKey = getCurrentMonthKey()) {
  return transactionDate.slice(0, 7) === monthKey;
}

export function getTransactionNetAmount(transaction: Pick<Transaction, "amount" | "type">) {
  if (transaction.type === "income") {
    return transaction.amount;
  }

  if (transaction.type === "expense") {
    return -transaction.amount;
  }

  return 0;
}

export function summarizeTransactions<T extends TransactionLike>(transactions: T[], now = new Date()) {
  const currentMonth = getCurrentMonthKey(now);
  let currentBalance = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  transactions.forEach((transaction) => {
    currentBalance += getTransactionNetAmount(transaction);

    if (!isTransactionInMonth(transaction.date, currentMonth)) {
      return;
    }

    if (transaction.type === "income") {
      monthlyIncome += transaction.amount;
    }

    if (transaction.type === "expense") {
      monthlyExpense += transaction.amount;
    }
  });

  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate =
    monthlyIncome > 0 ? Math.max(0, Math.round((monthlySavings / monthlyIncome) * 100)) : 0;

  return {
    currentBalance,
    monthlyExpense,
    monthlyIncome,
    monthlySavings,
    savingsRate
  };
}

export function getHighestSpendingTitle(
  transactions: Transaction[],
  monthKey = getCurrentMonthKey()
) {
  const totals = new Map<string, { amount: number; title: string }>();

  transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && isTransactionInMonth(transaction.date, monthKey)
    )
    .forEach((transaction) => {
      const group = getSpendingTitleGroup(transaction.title);
      const current = totals.get(group.key);
      totals.set(group.key, {
        amount: (current?.amount ?? 0) + transaction.amount,
        title: current?.title ?? group.title
      });
    });

  return Array.from(totals.values()).sort(
    (left, right) => right.amount - left.amount || left.title.localeCompare(right.title)
  )[0] ?? null;
}

export function sortExpensesByAmount(transactions: Transaction[], monthKey?: string) {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        (!monthKey || isTransactionInMonth(transaction.date, monthKey))
    )
    .sort(
      (left, right) =>
        right.amount - left.amount ||
        compareTransactions(left, right)
    );
}

export function inferTransactionType(category: string): Transaction["type"] {
  return category === "Salary" || category === "Investment" ? "income" : "expense";
}
