import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
import Grid from "@mui/material/Grid2";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { Anamnesis, AuthUser, Goal } from "../types/domain";
import { formatDate, formatDateTime, formatNumber, toOptionalInt, toOptionalNumber } from "../utils/format";

type ProfileGoalsScreenProps = {
  token: string;
  onUserRefresh: (nextUser: AuthUser) => void;
};

const goalTypes = [
  "HYPERTROPHY",
  "STRENGTH",
  "WEIGHT_LOSS",
  "RUN_5K",
  "RUN_10K",
  "RUN_21K",
  "RUN_42K",
  "OTHER"
] as const;

const GOAL_TYPE_LABELS: Record<(typeof goalTypes)[number], string> = {
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Força",
  WEIGHT_LOSS: "Emagrecimento",
  RUN_5K: "Corrida 5 km",
  RUN_10K: "Corrida 10 km",
  RUN_21K: "Corrida 21 km",
  RUN_42K: "Corrida 42 km",
  OTHER: "Outro"
};

const TRAINING_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado"
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  TRAINER: "Treinador",
  ATHLETE: "Aluno",
  STUDENT: "Aluno"
};

function translateGoalType(value: string): string {
  return GOAL_TYPE_LABELS[value as (typeof goalTypes)[number]] ?? value;
}

function translateTrainingLevel(value: string | null | undefined): string {
  if (!value) return "-";
  return TRAINING_LEVEL_LABELS[value] ?? value;
}

function translateRole(value: string | null | undefined): string {
  if (!value) return "";
  return ROLE_LABELS[value] ?? value;
}

export function ProfileGoalsScreen({ token, onUserRefresh }: ProfileGoalsScreenProps) {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [goalType, setGoalType] = useState<(typeof goalTypes)[number]>("HYPERTROPHY");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetValue, setGoalTargetValue] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");

  const [trainingLevel, setTrainingLevel] = useState("INTERMEDIATE");
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [limitations, setLimitations] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [profileResponse, goalsResponse, anamnesisResponse] = await Promise.all([
        apiRequest<AuthUser>("/api/profile/me", { token }),
        apiRequest<Goal[]>("/api/profile/me/goals", { token }),
        apiRequest<Anamnesis[]>("/api/profile/me/anamnesis", {
          token,
          query: { current: "true" }
        })
      ]);

      setProfile(profileResponse);
      setGoals(goalsResponse);
      setAnamnesis(anamnesisResponse);
      setFullName(profileResponse.fullName);
      onUserRefresh(profileResponse);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar perfil e metas."));
    } finally {
      setIsLoading(false);
    }
  }, [onUserRefresh, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function updateProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await apiRequest<AuthUser>("/api/profile/me", {
        method: "PATCH",
        token,
        body: {
          fullName
        }
      });
      setProfile(updated);
      onUserRefresh(updated);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao atualizar perfil."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createGoal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest<Goal>("/api/profile/me/goals", {
        method: "POST",
        token,
        body: {
          type: goalType,
          description: goalDescription.trim() || undefined,
          targetValue: toOptionalNumber(goalTargetValue),
          targetDate: goalTargetDate ? `${goalTargetDate}T12:00:00.000Z` : undefined
        }
      });
      setGoalDescription("");
      setGoalTargetValue("");
      setGoalTargetDate("");
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao criar meta."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createAnamnesis(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest<Anamnesis>("/api/profile/me/anamnesis", {
        method: "POST",
        token,
        body: {
          trainingLevel,
          age: toOptionalInt(age),
          weightKg: toOptionalNumber(weightKg),
          bodyFatPct: toOptionalNumber(bodyFatPct),
          limitations: limitations.trim() || undefined,
          isCurrent: true
        }
      });
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao registrar anamnese."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleGoal(goal: Goal): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/profile/me/goals/${goal.id}`, {
        method: "PATCH",
        token,
        body: {
          isActive: !goal.isActive
        }
      });
      await loadData();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao atualizar status da meta."));
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
          Perfil / Metas
        </Typography>
        <Typography color="text.secondary">Gerencie perfil, metas de performance e anamnese atual.</Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Perfil
              </Typography>
              <Box component="form" onSubmit={(event) => void updateProfile(event)}>
                <Stack spacing={1.5}>
                  <TextField label="Nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                  <TextField label="E-mail" value={profile?.email ?? ""} disabled />
                  <TextField label="Perfil de acesso" value={translateRole(profile?.role)} disabled />
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    Salvar perfil
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nova meta
              </Typography>
              <Box component="form" onSubmit={(event) => void createGoal(event)}>
                <Stack spacing={1.5}>
                  <TextField select label="Tipo de meta" value={goalType} onChange={(event) => setGoalType(event.target.value as (typeof goalTypes)[number])}>
                    {goalTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {GOAL_TYPE_LABELS[type]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Descrição"
                    value={goalDescription}
                    onChange={(event) => setGoalDescription(event.target.value)}
                    multiline
                    minRows={2}
                  />
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      label="Valor alvo"
                      type="number"
                      value={goalTargetValue}
                      onChange={(event) => setGoalTargetValue(event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Data alvo"
                      type="date"
                      value={goalTargetDate}
                      onChange={(event) => setGoalTargetDate(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Stack>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    Criar meta
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Anamnese atual
          </Typography>
          <Box component="form" onSubmit={(event) => void createAnamnesis(event)}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField select label="Nível de treino" value={trainingLevel} onChange={(event) => setTrainingLevel(event.target.value)} fullWidth>
                  <MenuItem value="BEGINNER">Iniciante</MenuItem>
                  <MenuItem value="INTERMEDIATE">Intermediário</MenuItem>
                  <MenuItem value="ADVANCED">Avançado</MenuItem>
                </TextField>
                <TextField label="Idade" type="number" value={age} onChange={(event) => setAge(event.target.value)} fullWidth />
                <TextField label="Peso (kg)" type="number" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} fullWidth />
                <TextField
                  label="% Gordura"
                  type="number"
                  value={bodyFatPct}
                  onChange={(event) => setBodyFatPct(event.target.value)}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Limitações"
                value={limitations}
                onChange={(event) => setLimitations(event.target.value)}
                multiline
                minRows={2}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                Registrar anamnese atual
              </Button>
            </Stack>
          </Box>

          {anamnesis.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Último registro</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDateTime(anamnesis[0].recordedAt)} • Nível: {translateTrainingLevel(anamnesis[0].trainingLevel)} • Peso:{" "}
                {formatNumber(anamnesis[0].weightKg, 1)} kg • Gordura: {formatNumber(anamnesis[0].bodyFatPct, 1)}%
              </Typography>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Metas cadastradas
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Alvo</TableCell>
                <TableCell>Data alvo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell>{translateGoalType(goal.type)}</TableCell>
                  <TableCell>{goal.description ?? "-"}</TableCell>
                  <TableCell>{formatNumber(goal.targetValue, 2)}</TableCell>
                  <TableCell>{formatDate(goal.targetDate)}</TableCell>
                  <TableCell>{goal.isActive ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell>
                    <Button size="small" variant="text" onClick={() => void toggleGoal(goal)} disabled={isSubmitting}>
                      {goal.isActive ? "Desativar" : "Ativar"}
                    </Button>
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
