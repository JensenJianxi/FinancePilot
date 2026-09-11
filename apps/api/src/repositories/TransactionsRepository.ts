import type {
  CreateTransactionRequestDto,
  ListTransactionsQueryDto,
  TransactionRecord,
  UpdateTransactionRequestDto
} from "@finance-pilot/shared";

export interface TransactionsRepository {
  createTransaction(
    userId: string,
    input: CreateTransactionRequestDto
  ): Promise<TransactionRecord>;
  deleteTransaction(userId: string, transactionId: string): Promise<boolean>;
  getTransaction(userId: string, transactionId: string): Promise<TransactionRecord | null>;
  listUserTransactions(userId: string, query?: ListTransactionsQueryDto): Promise<TransactionRecord[]>;
  updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionRequestDto
  ): Promise<TransactionRecord | null>;
}
