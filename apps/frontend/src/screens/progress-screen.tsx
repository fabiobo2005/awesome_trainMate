import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import type { AiLoadAnalysis, AiProgressSummary, ProgressSummary } from "../types/domain";
import { formatNumber } from "../utils/format";

type ProgressScreenProps = {
  token: string;
};

export function ProgressScreen({ token }: ProgressScreenProps) {
  const [periodDays, setPeriodDays] = useState(30);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<AiProgressSummary | null>(null);
  const [loadAnalysis, setLoadAnalysis] = useState<AiLoadAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [summaryResponse, aiSummaryResponse, loadAnalysisResponse] = await Promise.all([
        apiRequest<ProgressSummary>("/api/progress/summary", {
          token,
          query: { days: periodDays }
        }),
        apiRequest<AiProgressSummary>("/api/ai/progress-summary", {
          method: "POST",
          token,
          body: { periodDays }
        }),
        apiRequest<AiLoadAnalysis>("/api/ai/load-analysis", {
          method: "POST",
          token,
          body: { periodDays }
        })
      ]);

      setSummary(summaryResponse);
      setAiSummary(aiSummaryResponse);
      setLoadAnalysis(loadAnalysisResponse);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar métricas de progresso."));
    } finally {
      setIsLoading(false);
    }
  }, [periodDays, token]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

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
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Progress (com gráficos)
          </Typography>
          <Typography color="text.secondary">Acompanhe volume, aderência e distribuição de carga por grupamento muscular.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
            <MenuItem value={30}>30 dias</MenuItem>
            <MenuItem value={60}>60 dias</MenuItem>
            <MenuItem value={90}>90 dias</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={() => void loadProgress()}>
            Atualizar
          </Button>
        </Stack>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {summary ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Carga total no período
                </Typography>
                <Typography variant="h4">{formatNumber(summary.workouts.totalLoadKg, 1)} kg</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Distância total no período
                </Typography>
                <Typography variant="h4">{formatNumber(summary.runs.totalDistanceKm, 2)} km</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  PSE médio treino
                </Typography>
                <Typography variant="h4">{formatNumber(summary.workouts.avgPse, 2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Gráfico de frequência de sessões
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

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Gráfico de distribuição de carga por grupamento
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

      {aiSummary ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Leitura de progresso por IA
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Status: <strong>{aiSummary.summary.status}</strong> • Aderência:{" "}
              <strong>{formatNumber(aiSummary.summary.adherence_rate, 1)}%</strong>
            </Typography>
            <Typography variant="subtitle2">Riscos</Typography>
            <List dense disablePadding>
              {aiSummary.summary.risks.map((risk) => (
                <ListItem key={risk} sx={{ py: 0 }}>
                  <ListItemText primary={risk} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ) : null}

      {loadAnalysis ? (
        <Card variant="outlined">
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
      ) : null}
    </Stack>
  );
}
