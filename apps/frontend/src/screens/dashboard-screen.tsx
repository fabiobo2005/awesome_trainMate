import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { AiLoadAnalysis, AiProgressSummary, AiRecommendation, ProgressSummary } from "../types/domain";
import { formatNumber } from "../utils/format";

type DashboardScreenProps = {
  token: string;
};

const STATUS_LABELS: Record<string, string> = {
  "on-track": "No alvo",
  watch: "Atenção",
  "at-risk": "Em risco",
  "off-track": "Fora do alvo",
  behind: "Atrasado"
};

function translateStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const RECOVERY_LABELS: Record<string, string> = {
  low: "BAIXA",
  moderate: "MODERADA",
  medium: "MÉDIA",
  high: "ALTA"
};

function translateRecovery(priority: string): string {
  const normalized = priority?.toLowerCase?.() ?? "";
  return RECOVERY_LABELS[normalized] ?? priority?.toUpperCase?.() ?? priority;
}

export function DashboardScreen({ token }: DashboardScreenProps) {
  const [periodDays, setPeriodDays] = useState(30);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<AiProgressSummary | null>(null);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [loadAnalysis, setLoadAnalysis] = useState<AiLoadAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [summaryResponse, aiSummaryResponse, recommendationResponse, loadAnalysisResponse] = await Promise.all([
        apiRequest<ProgressSummary>("/api/progress/summary", {
          token,
          query: { days: periodDays }
        }),
        apiRequest<AiProgressSummary>("/api/ai/progress-summary", {
          method: "POST",
          token,
          body: { periodDays }
        }),
        apiRequest<AiRecommendation>("/api/ai/recommendation", {
          method: "POST",
          token,
          body: {}
        }),
        apiRequest<AiLoadAnalysis>("/api/ai/load-analysis", {
          method: "POST",
          token,
          body: { periodDays }
        })
      ]);

      setSummary(summaryResponse);
      setAiSummary(aiSummaryResponse);
      setRecommendation(recommendationResponse);
      setLoadAnalysis(loadAnalysisResponse);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar o painel."));
    } finally {
      setIsLoading(false);
    }
  }, [periodDays, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const sessionBars = summary
    ? [
        { label: "Musculação", value: summary.workouts.sessions },
        { label: "Cardio", value: summary.runs.sessions }
      ]
    : [];
  const maxSessionValue = Math.max(...sessionBars.map((bar) => bar.value), 1);

  const muscleLoads = loadAnalysis?.analysis.top_muscle_groups ?? [];
  const maxMuscleLoad = Math.max(...muscleLoads.map((group) => group.total_load_kg), 1);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Painel
          </Typography>
          <Typography color="text.secondary">
            Resumo, gráficos e recomendações de IA para o período selecionado.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
          >
            <MenuItem value={30}>30 dias</MenuItem>
            <MenuItem value={60}>60 dias</MenuItem>
            <MenuItem value={90}>90 dias</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={() => void loadDashboard()}>
            Atualizar
          </Button>
        </Stack>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {summary ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Sessões de musculação
                </Typography>
                <Typography variant="h4">{summary.workouts.sessions}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Carga total: {formatNumber(summary.workouts.totalLoadKg, 1)} kg
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Sessões de cardio
                </Typography>
                <Typography variant="h4">{summary.runs.sessions}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Distância total: {formatNumber(summary.runs.totalDistanceKm, 2)} km
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Registros de métricas
                </Typography>
                <Typography variant="h4">{summary.metrics.entries}</Typography>
                <Typography variant="body2" color="text.secondary">
                  PSE médio treino: {formatNumber(summary.workouts.avgPse, 2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Frequência de sessões
              </Typography>
              <Stack spacing={1.25}>
                {sessionBars.map((bar) => (
                  <Box key={bar.label}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">{bar.label}</Typography>
                      <Typography variant="body2">{bar.value}</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.5, height: 10, borderRadius: 5, bgcolor: "grey.200" }}>
                      <Box
                        sx={{
                          height: "100%",
                          width: `${(bar.value / maxSessionValue) * 100}%`,
                          bgcolor: "primary.main",
                          borderRadius: 5
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribuição de carga por grupamento
              </Typography>
              <Stack spacing={1.25}>
                {muscleLoads.length === 0 ? (
                  <Typography color="text.secondary">Sem dados de carga para o período.</Typography>
                ) : (
                  muscleLoads.map((group) => (
                    <Box key={group.muscle_group}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">{group.muscle_group}</Typography>
                        <Typography variant="body2">{formatNumber(group.total_load_kg, 1)} kg</Typography>
                      </Stack>
                      <Box sx={{ mt: 0.5, height: 10, borderRadius: 5, bgcolor: "grey.200" }}>
                        <Box
                          sx={{
                            height: "100%",
                            width: `${(group.total_load_kg / maxMuscleLoad) * 100}%`,
                            bgcolor: "secondary.main",
                            borderRadius: 5
                          }}
                        />
                      </Box>
                    </Box>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {aiSummary ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">Status inteligente</Typography>
                <Chip
                  size="small"
                  color={
                    aiSummary.summary.status === "on-track"
                      ? "success"
                      : aiSummary.summary.status === "watch"
                        ? "warning"
                        : "error"
                  }
                  label={translateStatus(aiSummary.summary.status)}
                />
              </Stack>
              <Typography variant="body2">
                Aderência estimada: <strong>{formatNumber(aiSummary.summary.adherence_rate, 1)}%</strong>
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2">Destaques</Typography>
                  <List dense disablePadding>
                    {aiSummary.summary.highlights.map((item) => (
                      <ListItem key={item} sx={{ py: 0 }}>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2">Riscos</Typography>
                  <List dense disablePadding>
                    {aiSummary.summary.risks.map((risk) => (
                      <ListItem key={risk} sx={{ py: 0 }}>
                        <ListItemText primary={risk} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2">Ações sugeridas</Typography>
                  <List dense disablePadding>
                    {aiSummary.summary.recommended_actions.map((item) => (
                      <ListItem key={item} sx={{ py: 0 }}>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={2}>
        {recommendation ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">Recomendação para o próximo treino</Typography>
                  <Typography>{recommendation.recommendation.recommendation}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ajuste de volume: {formatNumber(recommendation.recommendation.volume_adjustment_pct, 0)}% • Ajuste
                    de intensidade: {formatNumber(recommendation.recommendation.intensity_adjustment_pct, 0)}%
                  </Typography>
                  <Typography variant="body2">Foco: {recommendation.recommendation.next_focus}</Typography>
                  <Typography variant="body2">
                    Prioridade de recuperação:{" "}
                    <strong>{translateRecovery(recommendation.recommendation.recovery_priority)}</strong>
                  </Typography>
                  <Typography variant="subtitle2">Racional</Typography>
                  <List dense disablePadding>
                    {recommendation.recommendation.rationale.map((item) => (
                      <ListItem key={item} sx={{ py: 0 }}>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {loadAnalysis ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Insights de carga
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Delta vs período anterior: {formatNumber(loadAnalysis.analysis.delta_vs_previous_period_pct, 2)}%
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Alertas
                </Typography>
                <List dense disablePadding>
                  {loadAnalysis.analysis.imbalance_flags.map((flag) => (
                    <ListItem key={flag} sx={{ py: 0 }}>
                      <ListItemText primary={flag} />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Recomendações
                </Typography>
                <List dense disablePadding>
                  {loadAnalysis.analysis.recommendations.map((item) => (
                    <ListItem key={item} sx={{ py: 0 }}>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </Stack>
  );
}
