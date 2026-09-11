import { z } from "zod";

export const identifierSchema = z.string().min(1);
export const amountSchema = z.number().finite().nonnegative();
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const isoMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM");
export const isoDateTimeSchema = z.iso.datetime({ offset: true });
