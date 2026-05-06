import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { asyncHandler } from "../middleware/async-handler.js";

const tableNameSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_]+$/u, "Nome de tabela inválido");

const tableQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

type RawColumnRow = {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number | bigint;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_KEY: string;
  COLUMN_DEFAULT: string | null;
  EXTRA: string | null;
};

type RawTableRow = {
  TABLE_NAME: string;
  TABLE_ROWS: number | bigint | null;
  CREATE_TIME: Date | null;
  UPDATE_TIME: Date | null;
};

type RawCountRow = { count: number | bigint };

function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `<binary ${value.length} bytes>`;
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = jsonSafe(v);
    }
    return out;
  }
  return value;
}

function requireAdmin(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new HttpError(403, "Acesso restrito a administradores.");
  }
}

async function listTables(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<RawTableRow[]>(
    `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`
  );
  return rows.map((r) => r.TABLE_NAME);
}

export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use((req, _res, next) => {
  try {
    requireAdmin(req.auth?.role);
    next();
  } catch (error) {
    next(error);
  }
});

adminRouter.get(
  "/db/schema",
  asyncHandler(async (_req, res) => {
    const tableRows = await prisma.$queryRawUnsafe<RawTableRow[]>(
      `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`
    );

    const columnRows = await prisma.$queryRawUnsafe<RawColumnRow[]>(
      `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE, COLUMN_TYPE,
              IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );

    const columnsByTable = new Map<string, RawColumnRow[]>();
    for (const col of columnRows) {
      const existing = columnsByTable.get(col.TABLE_NAME);
      if (existing) existing.push(col);
      else columnsByTable.set(col.TABLE_NAME, [col]);
    }

    const tables = tableRows.map((row) => ({
      name: row.TABLE_NAME,
      approxRows: row.TABLE_ROWS != null ? Number(row.TABLE_ROWS) : null,
      createdAt: row.CREATE_TIME ? row.CREATE_TIME.toISOString() : null,
      updatedAt: row.UPDATE_TIME ? row.UPDATE_TIME.toISOString() : null,
      columns: (columnsByTable.get(row.TABLE_NAME) ?? []).map((col) => ({
        name: col.COLUMN_NAME,
        position: Number(col.ORDINAL_POSITION),
        dataType: col.DATA_TYPE,
        columnType: col.COLUMN_TYPE,
        nullable: col.IS_NULLABLE === "YES",
        key: col.COLUMN_KEY || null,
        default: col.COLUMN_DEFAULT,
        extra: col.EXTRA || null
      }))
    }));

    res.json({ tables });
  })
);

adminRouter.get(
  "/db/tables/:table",
  asyncHandler(async (req, res) => {
    const tableName = tableNameSchema.parse(req.params.table);
    const { limit, offset } = tableQuerySchema.parse(req.query);

    const allowed = await listTables();
    if (!allowed.includes(tableName)) {
      throw new HttpError(404, `Tabela '${tableName}' não encontrada.`);
    }

    const escaped = `\`${tableName.replace(/`/g, "``")}\``;

    const countRows = await prisma.$queryRawUnsafe<RawCountRow[]>(
      `SELECT COUNT(*) AS count FROM ${escaped}`
    );
    const total = countRows[0] ? Number(countRows[0].count) : 0;

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM ${escaped} LIMIT ${limit} OFFSET ${offset}`
    );

    const columnRows = await prisma.$queryRawUnsafe<RawColumnRow[]>(
      `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE, COLUMN_TYPE,
              IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      tableName
    );

    res.json({
      table: tableName,
      total,
      limit,
      offset,
      columns: columnRows.map((col) => ({
        name: col.COLUMN_NAME,
        dataType: col.DATA_TYPE,
        columnType: col.COLUMN_TYPE,
        nullable: col.IS_NULLABLE === "YES",
        key: col.COLUMN_KEY || null
      })),
      rows: rows.map((row) => jsonSafe(row))
    });
  })
);
