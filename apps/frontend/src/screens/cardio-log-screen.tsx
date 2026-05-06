import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { RunningSession } from "../types/domain";
import { formatDateTime, formatNumber, toOptionalInt, toOptionalNumber } from "../utils/format";

type CardioLogScreenProps = {
  token: string;
};

export function CardioLogScreen({ token }: CardioLogScreenProps) {
  const [sessions, setSessions] = useState<RunningSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [pace, setPace] = useState("");
  const [avgHeartRate, setAvgHeartRate] = useState("");
  const [pse, setPse] = useState("6");
  const [notes, setNotes] = useState("");

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<RunningSession[]>("/api/runs/sessions", { token });
      setSessions(response);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar sessões de cardio."));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest<RunningSession>("/api/runs/sessions", {
        method: "POST",
        token,
        body: {
          sessionDate: `${sessionDate}T12:00:00.000Z`,
          distanceKm: toOptionalNumber(distanceKm),
          durationMinutes: toOptionalInt(durationMinutes),
          pace: pace.trim() || undefined,
          avgHeartRate: toOptionalInt(avgHeartRate),
          pse: toOptionalInt(pse),
          notes: notes.trim() || undefined
        }
      });

      setDistanceKm("");
      setPace("");
      setAvgHeartRate("");
      setNotes("");
      await loadSessions();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao registrar sessão de cardio."));
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
          Treino de Cardio
        </Typography>
        <Typography color="text.secondary">Registre distância, duração, pace, frequência cardíaca e PSE.</Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
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
                <TextField label="Distância (km)" type="number" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} fullWidth />
                <TextField
                  label="Duração (min)"
                  type="number"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="Pace" value={pace} onChange={(event) => setPace(event.target.value)} fullWidth />
                <TextField
                  label="FC média"
                  type="number"
                  value={avgHeartRate}
                  onChange={(event) => setAvgHeartRate(event.target.value)}
                  fullWidth
                />
                <TextField label="PSE" type="number" value={pse} onChange={(event) => setPse(event.target.value)} fullWidth />
              </Stack>

              <TextField label="Observações" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar sessão cardio"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Sessões recentes</Typography>
            <Button variant="text" onClick={() => void loadSessions()}>
              Recarregar
            </Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Distância (km)</TableCell>
                <TableCell>Duração (min)</TableCell>
                <TableCell>Pace</TableCell>
                <TableCell>FC média</TableCell>
                <TableCell>PSE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.slice(0, 15).map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDateTime(session.sessionDate)}</TableCell>
                  <TableCell>{formatNumber(session.distanceKm, 2)}</TableCell>
                  <TableCell>{session.durationMinutes ?? "-"}</TableCell>
                  <TableCell>{session.pace ?? "-"}</TableCell>
                  <TableCell>{session.avgHeartRate ?? "-"}</TableCell>
                  <TableCell>{session.pse ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
