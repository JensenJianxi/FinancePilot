import { randomUUID } from "node:crypto";
import type {
  CreateTransactionRequestDto,
  ListTransactionsQueryDto,
  TransactionApiDto,
  TransactionRecord,
  UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import {
  createTransactionRequestDtoSchema,
  listTransactionsQueryDtoSchema,
  transactionApiDtoSchema,
  updateTransactionRequestDtoSchema
} from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { TransactionsRepository } from "../repositories";

function toTransactionApiDto(record: TransactionRecord): TransactionApiDto {
  return transactionApiDtoSchema.parse({
    amount: record.amount,
    category: record.category,
    createdAt: record.createdAt,
    note: record.note,
    paymentMethod: record.paymentMethod,
    title: record.title,
    transactionDate: record.transactionDate,
    transactionId: record.transactionId,
    type: record.type,
    updatedAt: record.updatedAt
  });
}

export class TransactionsService {
  constructor(private readonly repository: TransactionsRepository) {}

  async createTransaction(userId: string, input: CreateTransactionRequestDto): Promise<TransactionApiDto> {
    this.assertUserId(userId);
    const validatedInput = createTransactionRequestDtoSchema.parse(input);
    const createdRecord = await this.repository.createTransaction(userId, validatedInput);

    return toTransactionApiDto(createdRecord);
  }

  async deleteTransaction(userId: string, transactionId: string) {
    this.assertUserId(userId);
    this.assertTransactionId(transactionId);

    const deleted = await this.repository.deleteTransaction(userId, transactionId);

    if (!deleted) {
      throw new AppError("Transaction not found.", "TRANSACTION_NOT_FOUND", 404);
    }

    return {
      deleted: true,
      transactionId
    };
  }

  async getTransaction(userId: string, transactionId: string): Promise<TransactionApiDto> {
    this.assertUserId(userId);
    this.assertTransactionId(transactionId);

    const record = await this.repository.getTransaction(userId, transactionId);

    if (!record) {
      throw new AppError("Transaction not found.", "TRANSACTION_NOT_FOUND", 404);
    }

    return toTransactionApiDto(record);
  }

  async listTransactions(userId: string, query?: ListTransactionsQueryDto): Promise<TransactionApiDto[]> {
    this.assertUserId(userId);
    const validatedQuery = listTransactionsQueryDtoSchema.parse(query ?? {});
    const records = await this.repository.listUserTransactions(userId, validatedQuery);

    return records.map(toTransactionApiDto);
  }

  newTransactionId() {
    return `txn_${randomUUID()}`;
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionRequestDto
  ): Promise<TransactionApiDto> {
    this.assertUserId(userId);
    this.assertTransactionId(transactionId);
    const validatedInput = updateTransactionRequestDtoSchema.parse(input);
    const updatedRecord = await this.repository.updateTransaction(userId, transactionId, validatedInput);

    if (!updatedRecord) {
      throw new AppError("Transaction not found.", "TRANSACTION_NOT_FOUND", 404);
    }

    return toTransactionApiDto(updatedRecord);
  }

  private assertTransactionId(transactionId: string) {
    if (!transactionId.trim()) {
      throw new AppError("Transaction ID is required.", "TRANSACTION_ID_REQUIRED", 400);
    }
  }

  private assertUserId(userId: string) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }
  }
}
