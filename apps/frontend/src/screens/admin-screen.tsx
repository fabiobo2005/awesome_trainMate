import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";

type AdminScreenProps = {
  token: string;
};

type ColumnSchema = {
  name: string;
  position: number;
  dataType: string;
  columnType: string;
  nullable: boolean;
  key: string | null;
  default: string | null;
  extra: string | null;
};

type TableSchema = {
  name: string;
  approxRows: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  columns: ColumnSchema[];
};

type SchemaResponse = { tables: TableSchema[] };

type TableDataResponse = {
  table: string;
  total: number;
  limit: number;
  offset: number;
  columns: Array<{ name: string; dataType: string; columnType: string; nullable: boolean; key: string | null }>;
  rows: Array<Record<string, unknown>>;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return value.toString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AdminScreen({ token }: AdminScreenProps) {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [offset, setOffset] = useState(0);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);

  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSchema = useCallback(async () => {
    setIsLoadingSchema(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<SchemaResponse>("/api/admin/db/schema", { token });
      setTables(response.tables);
      if (!selectedTable && response.tables.length > 0) {
        setSelectedTable(response.tables[0].name);
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar schema do banco."));
    } finally {
      setIsLoadingSchema(false);
    }
  }, [selectedTable, token]);

  useEffect(() => {
    void loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTableData = useCallback(
    async (table: string, nextOffset: number, nextLimit: number) => {
      if (!table) return;
      setIsLoadingData(true);
      setErrorMessage(null);
      try {
        const response = await apiRequest<TableDataResponse>(`/api/admin/db/tables/${table}`, {
          token,
          query: { limit: nextLimit, offset: nextOffset }
        });
        setTableData(response);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, `Falha ao carregar dados da tabela ${table}.`));
      } finally {
        setIsLoadingData(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedTable) {
      setOffset(0);
      void loadTableData(selectedTable, 0, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  const filteredTables = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(term));
  }, [filter, tables]);

  const selectedSchema = useMemo(
    () => tables.find((t) => t.name === selectedTable) ?? null,
    [selectedTable, tables]
  );

  const totalPages = tableData ? Math.max(1, Math.ceil(tableData.total / tableData.limit)) : 1;
  const currentPage = tableData ? Math.floor(tableData.offset / tableData.limit) + 1 : 1;

  function changePage(direction: "prev" | "next" | "first" | "last"): void {
    if (!tableData) return;
    let nextOffset = offset;
    if (direction === "prev") nextOffset = Math.max(0, offset - pageSize);
    if (direction === "next") nextOffset = Math.min((totalPages - 1) * pageSize, offset + pageSize);
    if (direction === "first") nextOffset = 0;
    if (direction === "last") nextOffset = (totalPages - 1) * pageSize;
    setOffset(nextOffset);
    void loadTableData(selectedTable, nextOffset, pageSize);
  }

  function changePageSize(value: number): void {
    setPageSize(value);
    setOffset(0);
    void loadTableData(selectedTable, 0, value);
  }

  if (isLoadingSchema) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Administração — Banco de Dados
        </Typography>
        <Typography color="text.secondary">
          Visão somente-leitura do schema (tabelas e campos) e dos dados armazenados. Acesso restrito a administradores.
        </Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch">
        <Card variant="outlined" sx={{ width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Tabelas ({tables.length})</Typography>
                <Button size="small" variant="text" onClick={() => void loadSchema()}>
                  Recarregar
                </Button>
              </Stack>
              <TextField
                size="small"
                label="Filtrar tabelas"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                fullWidth
              />
              <Box sx={{ maxHeight: 480, overflowY: "auto" }}>
                <Stack spacing={0.5}>
                  {filteredTables.map((table) => {
                    const isActive = table.name === selectedTable;
                    return (
                      <Button
                        key={table.name}
                        size="small"
                        variant={isActive ? "contained" : "text"}
                        color={isActive ? "primary" : "inherit"}
                        onClick={() => setSelectedTable(table.name)}
                        sx={{ justifyContent: "space-between", textTransform: "none" }}
                      >
                        <span>{table.name}</span>
                        <Chip
                          size="small"
                          label={`${table.columns.length} cols`}
                          sx={{ ml: 1 }}
                          variant="outlined"
                        />
                      </Button>
                    );
                  })}
                  {filteredTables.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma tabela encontrada.
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          {selectedSchema ? (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                    <Typography variant="h6">Schema · {selectedSchema.name}</Typography>
                    <Stack direction="row" spacing={1}>
                      {selectedSchema.approxRows != null ? (
                        <Chip size="small" label={`~${selectedSchema.approxRows} linhas (estimado)`} />
                      ) : null}
                      <Chip size="small" label={`${selectedSchema.columns.length} colunas`} />
                    </Stack>
                  </Stack>
                  <TableContainer sx={{ maxHeight: 280 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Coluna</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Nulo?</TableCell>
                          <TableCell>Chave</TableCell>
                          <TableCell>Default</TableCell>
                          <TableCell>Extra</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedSchema.columns.map((col) => (
                          <TableRow key={col.name}>
                            <TableCell>{col.position}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace" }}>{col.name}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace" }}>{col.columnType}</TableCell>
                            <TableCell>{col.nullable ? "Sim" : "Não"}</TableCell>
                            <TableCell>{col.key ?? "—"}</TableCell>
                            <TableCell>{col.default ?? "—"}</TableCell>
                            <TableCell>{col.extra ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Typography variant="h6">
                    Dados {tableData ? `(${tableData.total} registros)` : ""}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      label="Tamanho da página"
                      value={pageSize}
                      onChange={(event) => changePageSize(Number(event.target.value))}
                      sx={{ width: 160 }}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <MenuItem key={size} value={size}>
                          {size}
                        </MenuItem>
                      ))}
                    </TextField>
                    <IconButton size="small" disabled={currentPage <= 1 || isLoadingData} onClick={() => changePage("first")}>
                      «
                    </IconButton>
                    <IconButton size="small" disabled={currentPage <= 1 || isLoadingData} onClick={() => changePage("prev")}>
                      ‹
                    </IconButton>
                    <Typography variant="body2">
                      Página {currentPage} / {totalPages}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={currentPage >= totalPages || isLoadingData}
                      onClick={() => changePage("next")}
                    >
                      ›
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={currentPage >= totalPages || isLoadingData}
                      onClick={() => changePage("last")}
                    >
                      »
                    </IconButton>
                  </Stack>
                </Stack>

                {isLoadingData ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : tableData ? (
                  <TableContainer sx={{ maxHeight: 540 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {tableData.columns.map((col) => (
                            <TableCell key={col.name} sx={{ whiteSpace: "nowrap", fontFamily: "monospace" }}>
                              {col.name}
                              {col.key === "PRI" ? " 🔑" : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableData.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={tableData.columns.length}>
                              <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                                Sem registros nesta página.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          tableData.rows.map((row, idx) => (
                            <TableRow key={idx} hover>
                              {tableData.columns.map((col) => {
                                const raw = formatCellValue(row[col.name]);
                                const truncated = raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
                                return (
                                  <TableCell
                                    key={col.name}
                                    sx={{ fontFamily: "monospace", fontSize: 12, maxWidth: 360 }}
                                    title={raw.length > 200 ? raw : undefined}
                                  >
                                    {truncated}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </Stack>
  );
}
