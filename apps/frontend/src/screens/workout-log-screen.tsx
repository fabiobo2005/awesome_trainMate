import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { CatalogExercise, WorkoutSession } from "../types/domain";
import { formatDateTime, formatNumber, toOptionalInt, toOptionalNumber } from "../utils/format";

type WorkoutLogScreenProps = {
  token: string;
};

type SetDraft = {
  id: string;
  exerciseLibraryId: string;
  setNumber: string;
  repsExecuted: string;
  weightKg: string;
  notes: string;
};

function createSetDraft(index = 1): SetDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    exerciseLibraryId: "",
    setNumber: String(index),
    repsExecuted: "10",
    weightKg: "",
    notes: ""
  };
}

export function WorkoutLogScreen({ token }: WorkoutLogScreenProps) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [pse, setPse] = useState("7");
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<SetDraft[]>([createSetDraft(1)]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [sessionsResponse, exercisesResponse] = await Promise.all([
        apiRequest<WorkoutSession[]>("/api/workouts/sessions", { token }),
        apiRequest<CatalogExercise[]>("/api/catalog/exercises", {
          token,
          query: { limit: 200 }
        })
      ]);
      setSessions(sessionsResponse);
      setExercises(exercisesResponse);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar sessões de musculação."));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const exerciseNameById = useMemo(() => {
    return new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  }, [exercises]);

  function addSet(): void {
    setSets((current) => [...current, createSetDraft(current.length + 1)]);
  }

  function removeSet(id: string): void {
    setSets((current) => current.filter((set) => set.id !== id).map((set, index) => ({ ...set, setNumber: String(index + 1) })));
  }

  function updateSet(id: string, key: keyof SetDraft, value: string): void {
    setSets((current) => current.map((set) => (set.id === id ? { ...set, [key]: value } : set)));
  }

  async function handleCreateSession(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const parsedDuration = toOptionalInt(durationMinutes);
    const parsedPse = toOptionalInt(pse);
    const setsPayload = sets
      .map((set, index) => ({
        exerciseLibraryId: set.exerciseLibraryId || undefined,
        setNumber: toOptionalInt(set.setNumber) ?? index + 1,
        repsExecuted: toOptionalInt(set.repsExecuted) ?? 0,
        weightKg: toOptionalNumber(set.weightKg),
        notes: set.notes.trim() || undefined
      }))
      .filter((set) => set.repsExecuted > 0);

    if (setsPayload.length === 0) {
      setErrorMessage("Adicione ao menos um set com repetições válidas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest<WorkoutSession>("/api/workouts/sessions", {
        method: "POST",
        token,
        body: {
          sessionDate: `${sessionDate}T12:00:00.000Z`,
          durationMinutes: parsedDuration,
          pse: parsedPse,
          notes: notes.trim() || undefined,
          sets: setsPayload
        }
      });

      setNotes("");
      setSets([createSetDraft(1)]);
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao criar sessão de musculação."));
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
          Log Workout (Musculação)
        </Typography>
        <Typography color="text.secondary">Registre séries, repetições, carga e PSE para cálculo automático de carga total e UA.</Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Box component="form" onSubmit={(event) => void handleCreateSession(event)}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Data"
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Duração (min)"
                  type="number"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="PSE (1-10)"
                  type="number"
                  value={pse}
                  onChange={(event) => setPse(event.target.value)}
                  fullWidth
                />
              </Stack>

              <TextField label="Observações da sessão" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Sets executados</Typography>
                <Button variant="outlined" onClick={addSet}>
                  Adicionar set
                </Button>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Exercício</TableCell>
                    <TableCell sx={{ width: 90 }}>Set</TableCell>
                    <TableCell sx={{ width: 110 }}>Reps</TableCell>
                    <TableCell sx={{ width: 140 }}>Carga (kg)</TableCell>
                    <TableCell>Obs</TableCell>
                    <TableCell sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sets.map((set) => (
                    <TableRow key={set.id}>
                      <TableCell>
                        <TextField
                          select
                          value={set.exerciseLibraryId}
                          onChange={(event) => updateSet(set.id, "exerciseLibraryId", event.target.value)}
                          fullWidth
                          size="small"
                        >
                          <MenuItem value="">Sem vínculo</MenuItem>
                          {exercises.map((exercise) => (
                            <MenuItem key={exercise.id} value={exercise.id}>
                              {exercise.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={set.setNumber}
                          onChange={(event) => updateSet(set.id, "setNumber", event.target.value)}
                          type="number"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={set.repsExecuted}
                          onChange={(event) => updateSet(set.id, "repsExecuted", event.target.value)}
                          type="number"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={set.weightKg}
                          onChange={(event) => updateSet(set.id, "weightKg", event.target.value)}
                          type="number"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField value={set.notes} onChange={(event) => updateSet(set.id, "notes", event.target.value)} size="small" fullWidth />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remover set">
                          <IconButton color="error" onClick={() => removeSet(set.id)} size="small">
                            ×
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar sessão"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Sessões recentes</Typography>
            <Button variant="text" onClick={() => void loadData()}>
              Recarregar
            </Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>PSE</TableCell>
                <TableCell>UA</TableCell>
                <TableCell>Carga total (kg)</TableCell>
                <TableCell>Sets</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.slice(0, 12).map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDateTime(session.sessionDate)}</TableCell>
                  <TableCell>{session.durationMinutes ?? "-"}</TableCell>
                  <TableCell>{session.pse ?? "-"}</TableCell>
                  <TableCell>{formatNumber(session.arbitraryUnits, 1)}</TableCell>
                  <TableCell>{formatNumber(session.totalLoadKg, 1)}</TableCell>
                  <TableCell>
                    {session.workoutSets.length > 0 ? (
                      <Stack spacing={0.25}>
                        {session.workoutSets.slice(0, 3).map((set) => (
                          <Typography key={set.id} variant="caption" color="text.secondary">
                            #{set.setNumber} {exerciseNameById.get(set.exerciseLibraryId ?? "") ?? "Exercício livre"} •{" "}
                            {set.repsExecuted} reps • {formatNumber(set.weightKg, 1)} kg
                          </Typography>
                        ))}
                        {session.workoutSets.length > 3 ? (
                          <Typography variant="caption" color="text.secondary">
                            +{session.workoutSets.length - 3} sets
                          </Typography>
                        ) : null}
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
