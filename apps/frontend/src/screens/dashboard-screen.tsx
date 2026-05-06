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
  Stack,
  Typography
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { AiProgressSummary, AiRecommendation, ProgressSummary } from "../types/domain";
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
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<AiProgressSummary | null>(null);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [summaryResponse, aiSummaryResponse, recommendationResponse] = await Promise.all([
        apiRequest<ProgressSummary>("/api/progress/summary", {
          token,
          query: { days: 30 }
        }),
        apiRequest<AiProgressSummary>("/api/ai/progress-summary", {
          method: "POST",
          token,
          body: { periodDays: 30 }
        }),
        apiRequest<AiRecommendation>("/api/ai/recommendation", {
          method: "POST",
          token,
          body: {}
        })
      ]);

      setSummary(summaryResponse);
      setAiSummary(aiSummaryResponse);
      setRecommendation(recommendationResponse);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar o dashboard."));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Painel
          </Typography>
          <Typography color="text.secondary">Resumo dos últimos 30 dias e recomendações do motor de IA.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => void loadDashboard()}>
          Atualizar
        </Button>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {summary ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
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
          <Grid size={{ xs: 12, md: 4 }}>
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
          <Grid size={{ xs: 12, md: 4 }}>
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
              <Typography variant="subtitle2">Destaques</Typography>
              <List dense disablePadding>
                {aiSummary.summary.highlights.map((item) => (
                  <ListItem key={item} sx={{ py: 0 }}>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
              <Typography variant="subtitle2">Ações sugeridas</Typography>
              <List dense disablePadding>
                {aiSummary.summary.recommended_actions.map((item) => (
                  <ListItem key={item} sx={{ py: 0 }}>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {recommendation ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">Recomendação para o próximo treino</Typography>
              <Typography>{recommendation.recommendation.recommendation}</Typography>
              <Typography variant="body2" color="text.secondary">
                Ajuste de volume: {formatNumber(recommendation.recommendation.volume_adjustment_pct, 0)}% • Ajuste de
                intensidade: {formatNumber(recommendation.recommendation.intensity_adjustment_pct, 0)}%
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
      ) : null}
    </Stack>
  );
}
