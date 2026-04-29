import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { CatalogExercise, TrainingBlock, TrainingMethod } from "../types/domain";

type TrainingPlansScreenProps = {
  token: string;
};

export function TrainingPlansScreen({ token }: TrainingPlansScreenProps) {
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [methods, setMethods] = useState<TrainingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [blockName, setBlockName] = useState("Bloco de Hipertrofia");
  const [monthRef, setMonthRef] = useState("");
  const [isTemplate, setIsTemplate] = useState("false");

  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [dayName, setDayName] = useState("Amarelo");
  const [dayNumber, setDayNumber] = useState("1");
  const [muscleGroups, setMuscleGroups] = useState("Peito, Ombro, Tríceps");

  const [selectedDayId, setSelectedDayId] = useState("");
  const [microcycleNumber, setMicrocycleNumber] = useState("1");

  const [selectedMicrocycleId, setSelectedMicrocycleId] = useState("");
  const [exerciseLibraryId, setExerciseLibraryId] = useState("");
  const [trainingMethodId, setTrainingMethodId] = useState("");
  const [series, setSeries] = useState("4");
  const [reps, setReps] = useState("10");
  const [orderIndex, setOrderIndex] = useState("1");
  const [cadence, setCadence] = useState("2-2");
  const [restSeconds, setRestSeconds] = useState("60");
  const [observations, setObservations] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [blocksResponse, exercisesResponse, methodsResponse] = await Promise.all([
        apiRequest<TrainingBlock[]>("/api/plans/blocks", {
          token,
          query: { active: "all", limit: 30 }
        }),
        apiRequest<CatalogExercise[]>("/api/catalog/exercises", {
          token,
          query: { limit: 300 }
        }),
        apiRequest<TrainingMethod[]>("/api/catalog/methods", {
          token
        })
      ]);

      setBlocks(blocksResponse);
      setExercises(exercisesResponse);
      setMethods(methodsResponse);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar planos de treino."));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dayOptions = useMemo(
    () =>
      blocks.flatMap((block) =>
        block.trainingDays.map((day) => ({
          id: day.id,
          label: `${block.name} • ${day.dayName} (${day.dayNumber})`
        }))
      ),
    [blocks]
  );

  const microcycleOptions = useMemo(
    () =>
      blocks.flatMap((block) =>
        block.trainingDays.flatMap((day) =>
          day.microcycles.map((microcycle) => ({
            id: microcycle.id,
            label: `${block.name} • ${day.dayName} • Microciclo ${microcycle.microcycleNumber}`
          }))
        )
      ),
    [blocks]
  );

  useEffect(() => {
    if (!selectedBlockId && blocks.length > 0) setSelectedBlockId(blocks[0].id);
  }, [blocks, selectedBlockId]);

  useEffect(() => {
    if (!selectedDayId && dayOptions.length > 0) setSelectedDayId(dayOptions[0].id);
  }, [dayOptions, selectedDayId]);

  useEffect(() => {
    if (!selectedMicrocycleId && microcycleOptions.length > 0) setSelectedMicrocycleId(microcycleOptions[0].id);
  }, [microcycleOptions, selectedMicrocycleId]);

  async function createBlock(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest<TrainingBlock>("/api/plans/blocks", {
        method: "POST",
        token,
        body: {
          name: blockName,
          monthRef: monthRef || undefined,
          isTemplate: isTemplate === "true"
        }
      });
      setBlockName("Novo bloco");
      setMonthRef("");
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao criar bloco."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createDay(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedBlockId) {
      setErrorMessage("Selecione um bloco para adicionar o dia.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/plans/blocks/${selectedBlockId}/days`, {
        method: "POST",
        token,
        body: {
          dayName,
          dayNumber: Number(dayNumber),
          muscleGroups
        }
      });
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao criar dia de treino."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createMicrocycle(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedDayId) {
      setErrorMessage("Selecione um dia para adicionar microciclo.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/plans/days/${selectedDayId}/microcycles`, {
        method: "POST",
        token,
        body: {
          microcycleNumber: Number(microcycleNumber)
        }
      });
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao criar microciclo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createPlannedExercise(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedMicrocycleId) {
      setErrorMessage("Selecione um microciclo para incluir exercício.");
      return;
    }
    if (!exerciseLibraryId) {
      setErrorMessage("Selecione um exercício da biblioteca.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/plans/microcycles/${selectedMicrocycleId}/exercises`, {
        method: "POST",
        token,
        body: {
          exerciseLibraryId,
          trainingMethodId: trainingMethodId || undefined,
          series: Number(series),
          reps: Number(reps),
          orderIndex: Number(orderIndex),
          cadence: cadence || undefined,
          restSeconds: restSeconds ? Number(restSeconds) : undefined,
          observations: observations || undefined
        }
      });
      setOrderIndex(String(Number(orderIndex) + 1));
      setObservations("");
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao criar exercício planejado."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
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
          Planos de Treino
        </Typography>
        <Typography color="text.secondary">
          Estrutura de bloco → dia → microciclo → exercício com vínculo à biblioteca e métodos.
        </Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              1) Criar bloco
            </Typography>
            <Box component="form" onSubmit={(event) => void createBlock(event)}>
              <Stack spacing={1.5}>
                <TextField label="Nome do bloco" value={blockName} onChange={(event) => setBlockName(event.target.value)} required />
                <TextField label="Mês de referência" value={monthRef} onChange={(event) => setMonthRef(event.target.value)} placeholder="ex.: JAN-2026" />
                <TextField select label="Template" value={isTemplate} onChange={(event) => setIsTemplate(event.target.value)}>
                  <MenuItem value="false">Não</MenuItem>
                  <MenuItem value="true">Sim</MenuItem>
                </TextField>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  Criar bloco
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              2) Criar dia
            </Typography>
            <Box component="form" onSubmit={(event) => void createDay(event)}>
              <Stack spacing={1.5}>
                <TextField select label="Bloco" value={selectedBlockId} onChange={(event) => setSelectedBlockId(event.target.value)} required>
                  {blocks.map((block) => (
                    <MenuItem key={block.id} value={block.id}>
                      {block.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Nome do dia" value={dayName} onChange={(event) => setDayName(event.target.value)} required />
                <TextField label="Número do dia" type="number" value={dayNumber} onChange={(event) => setDayNumber(event.target.value)} required />
                <TextField label="Grupos musculares" value={muscleGroups} onChange={(event) => setMuscleGroups(event.target.value)} required />
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  Criar dia
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              3) Criar microciclo
            </Typography>
            <Box component="form" onSubmit={(event) => void createMicrocycle(event)}>
              <Stack spacing={1.5}>
                <TextField select label="Dia" value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)} required>
                  {dayOptions.map((day) => (
                    <MenuItem key={day.id} value={day.id}>
                      {day.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Número do microciclo"
                  type="number"
                  value={microcycleNumber}
                  onChange={(event) => setMicrocycleNumber(event.target.value)}
                  required
                />
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  Criar microciclo
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              4) Criar exercício planejado
            </Typography>
            <Box component="form" onSubmit={(event) => void createPlannedExercise(event)}>
              <Stack spacing={1.5}>
                <TextField
                  select
                  label="Microciclo"
                  value={selectedMicrocycleId}
                  onChange={(event) => setSelectedMicrocycleId(event.target.value)}
                  required
                >
                  {microcycleOptions.map((microcycle) => (
                    <MenuItem key={microcycle.id} value={microcycle.id}>
                      {microcycle.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Exercício"
                  value={exerciseLibraryId}
                  onChange={(event) => setExerciseLibraryId(event.target.value)}
                  required
                >
                  {exercises.map((exercise) => (
                    <MenuItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Método" value={trainingMethodId} onChange={(event) => setTrainingMethodId(event.target.value)}>
                  <MenuItem value="">Sem método</MenuItem>
                  {methods.map((method) => (
                    <MenuItem key={method.id} value={method.id}>
                      {method.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Séries" type="number" value={series} onChange={(event) => setSeries(event.target.value)} required fullWidth />
                  <TextField label="Reps" type="number" value={reps} onChange={(event) => setReps(event.target.value)} required fullWidth />
                  <TextField label="Ordem" type="number" value={orderIndex} onChange={(event) => setOrderIndex(event.target.value)} required fullWidth />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Cadência" value={cadence} onChange={(event) => setCadence(event.target.value)} fullWidth />
                  <TextField
                    label="Intervalo (s)"
                    type="number"
                    value={restSeconds}
                    onChange={(event) => setRestSeconds(event.target.value)}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Observações"
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  multiline
                  minRows={2}
                />
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  Criar exercício
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Divider />

      <Stack spacing={1}>
        <Typography variant="h6">Estrutura atual dos blocos</Typography>
        {blocks.length === 0 ? (
          <Typography color="text.secondary">Nenhum bloco cadastrado.</Typography>
        ) : (
          blocks.map((block) => (
            <Accordion key={block.id} disableGutters>
              <AccordionSummary expandIcon={<span>▾</span>}>
                <Stack>
                  <Typography fontWeight={600}>
                    {block.name} {block.monthRef ? `• ${block.monthRef}` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {block.trainingDays.length} dia(s) • {block.isTemplate ? "Template" : "Plano ativo"}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {block.trainingDays.length === 0 ? (
                  <Typography color="text.secondary">Sem dias cadastrados.</Typography>
                ) : (
                  block.trainingDays.map((day) => (
                    <Card key={day.id} variant="outlined" sx={{ mb: 1.25 }}>
                      <CardContent>
                        <Typography fontWeight={600}>
                          Dia {day.dayNumber} • {day.dayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Grupamentos: {day.muscleGroups}
                        </Typography>

                        {day.microcycles.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Sem microciclos cadastrados.
                          </Typography>
                        ) : (
                          day.microcycles.map((microcycle) => (
                            <Box key={microcycle.id} sx={{ mb: 1.5 }}>
                              <Typography variant="subtitle2">Microciclo {microcycle.microcycleNumber}</Typography>
                              {microcycle.exercises.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  Sem exercícios planejados.
                                </Typography>
                              ) : (
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Ordem</TableCell>
                                      <TableCell>Exercício</TableCell>
                                      <TableCell>Séries</TableCell>
                                      <TableCell>Reps</TableCell>
                                      <TableCell>Método</TableCell>
                                      <TableCell>Cadência</TableCell>
                                      <TableCell>Intervalo</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {microcycle.exercises.map((exercise) => (
                                      <TableRow key={exercise.id}>
                                        <TableCell>{exercise.orderIndex}</TableCell>
                                        <TableCell>{exercise.exerciseLibrary.name}</TableCell>
                                        <TableCell>{exercise.series}</TableCell>
                                        <TableCell>{exercise.reps}</TableCell>
                                        <TableCell>{exercise.trainingMethod?.name ?? "-"}</TableCell>
                                        <TableCell>{exercise.cadence ?? "-"}</TableCell>
                                        <TableCell>{exercise.restSeconds ?? "-"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </Box>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Stack>
    </Stack>
  );
}
