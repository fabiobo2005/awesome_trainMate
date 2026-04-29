import { Prisma } from "@prisma/client";

export function toDecimal(value?: number | null): Prisma.Decimal | null {
  if (value === undefined || value === null) return null;
  return new Prisma.Decimal(value);
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value.toString());
}

export function serializeDecimals<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (input instanceof Prisma.Decimal) {
    return Number(input.toString()) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => serializeDecimals(item)) as T;
  }

  if (typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }

  return input;
}

