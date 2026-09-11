import {
  createTransactionRequestDtoSchema,
  transactionApiDtoSchema,
  updateTransactionRequestDtoSchema,
  type CreateTransactionRequestDto,
  type Transaction,
  type TransactionApiDto,
  type UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import { requestApi, hasConfiguredApiBaseUrl } from "./financeApi";

function toTransaction(transaction: TransactionApiDto): Transaction {
  return {
    amount: transaction.amount,
    category: transaction.category,
    createdAt: transaction.createdAt,
    date: transaction.transactionDate,
    id: transaction.transactionId,
    notes: transaction.note ?? "",
    paymentMethod: transaction.paymentMethod,
    title: transaction.title,
    type: transaction.type,
    updatedAt: transaction.updatedAt
  };
}

export function isTransactionsApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function createTransaction(input: CreateTransactionRequestDto): Promise<Transaction> {
  const payload = createTransactionRequestDtoSchema.parse(input);
  const response = await requestApi<TransactionApiDto>("/transactions", {
    body: JSON.stringify(payload),
    method: "POST"
  });

  return toTransaction(transactionApiDtoSchema.parse(response));
}

export async function listTransactions(): Promise<Transaction[]> {
  const response = await requestApi<TransactionApiDto[]>("/transactions");
  return response.map((item) => toTransaction(transactionApiDtoSchema.parse(item)));
}

export async function getTransaction(transactionId: string): Promise<Transaction> {
  const response = await requestApi<TransactionApiDto>(`/transactions/${encodeURIComponent(transactionId)}`);
  return toTransaction(transactionApiDtoSchema.parse(response));
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateTransactionRequestDto
): Promise<Transaction> {
  const payload = updateTransactionRequestDtoSchema.parse(input);
  const response = await requestApi<TransactionApiDto>(`/transactions/${encodeURIComponent(transactionId)}`, {
    body: JSON.stringify(payload),
    method: "PATCH"
  });

  return toTransaction(transactionApiDtoSchema.parse(response));
}

export async function deleteTransaction(transactionId: string): Promise<{ deleted: boolean; transactionId: string }> {
  return requestApi<{ deleted: boolean; transactionId: string }>(
    `/transactions/${encodeURIComponent(transactionId)}`,
    {
      method: "DELETE"
    }
  );
}
