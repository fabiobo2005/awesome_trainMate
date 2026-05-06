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
import { useCallback, useEffect, useState } from "react";
import { apiRequest, extractErrorMessage } from "../api/client";
import type { CatalogExercise } from "../types/domain";

type ExerciseLibraryScreenProps = {
  token: string;
};

type MuscleGroupResponse = {
  muscleGroups: string[];
};

export function ExerciseLibraryScreen({ token }: ExerciseLibraryScreenProps) {
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMuscleGroups = useCallback(async () => {
    const response = await apiRequest<MuscleGroupResponse>("/api/catalog/muscle-groups", {
      token
    });
    setMuscleGroups(response.muscleGroups);
  }, [token]);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<CatalogExercise[]>("/api/catalog/exercises", {
        token,
        query: {
          search: search || undefined,
          muscleGroup: selectedMuscleGroup || undefined,
          limit: 300
        }
      });
      setExercises(response);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Falha ao carregar biblioteca de exercícios."));
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedMuscleGroup, token]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadMuscleGroups(), loadExercises()]).catch((error) => {
      if (!cancelled) setErrorMessage(extractErrorMessage(error, "Falha ao carregar catálogo."));
    });
    return () => {
      cancelled = true;
    };
  }, [loadExercises, loadMuscleGroups]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Biblioteca de Exercícios
        </Typography>
        <Typography color="text.secondary">
          {exercises.length > 0
            ? `Catálogo populado com ${exercises.length} exercícios extraídos das planilhas de treino.`
            : "Catálogo de exercícios extraídos das planilhas de treino."}
        </Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Buscar exercício"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: Supino, Agachamento, Remada..."
              fullWidth
            />
            <TextField
              select
              label="Grupamento"
              value={selectedMuscleGroup}
              onChange={(event) => setSelectedMuscleGroup(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {muscleGroups.map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={() => void loadExercises()}>
              Aplicar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          {isLoading ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Exercício</TableCell>
                  <TableCell>Grupamento</TableCell>
                  <TableCell>Equipamento</TableCell>
                  <TableCell>Métodos associados</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell>{exercise.name}</TableCell>
                    <TableCell>{exercise.muscleGroup}</TableCell>
                    <TableCell>{exercise.equipment ?? "-"}</TableCell>
                    <TableCell>
                      {exercise.methodLinks.length > 0
                        ? exercise.methodLinks.map((link) => link.trainingMethod.name).join(", ")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
