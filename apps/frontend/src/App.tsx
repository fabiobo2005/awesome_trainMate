import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from "@mui/material";
import { useMemo, useState } from "react";
import { AuthSessionProvider, useAuthSession } from "./auth/session";
import { CardioLogScreen } from "./screens/cardio-log-screen";
import { DashboardScreen } from "./screens/dashboard-screen";
import { ExerciseLibraryScreen } from "./screens/exercise-library-screen";
import { LoginScreen } from "./screens/login-screen";
import { ProfileGoalsScreen } from "./screens/profile-goals-screen";
import { ProgressScreen } from "./screens/progress-screen";
import { TrainingPlansScreen } from "./screens/training-plans-screen";
import { WorkoutLogScreen } from "./screens/workout-log-screen";

type ScreenTab = "dashboard" | "workout" | "cardio" | "progress" | "library" | "plans" | "profile";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  TRAINER: "Treinador",
  ATHLETE: "Aluno",
  STUDENT: "Aluno"
};

function translateRole(role: string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role;
}

const tabs: Array<{ value: ScreenTab; label: string }> = [
  { value: "dashboard", label: "Painel" },
  { value: "workout", label: "Treino" },
  { value: "cardio", label: "Cardio" },
  { value: "progress", label: "Progresso" },
  { value: "library", label: "Biblioteca" },
  { value: "plans", label: "Planos" },
  { value: "profile", label: "Perfil/Metas" }
];

function AuthenticatedApp() {
  const { session, isLoading, errorMessage, login, logout, clearError, updateUser } = useAuthSession();
  const [activeTab, setActiveTab] = useState<ScreenTab>("dashboard");

  const activeScreen = useMemo(() => {
    if (!session) return null;

    switch (activeTab) {
      case "dashboard":
        return <DashboardScreen token={session.accessToken} />;
      case "workout":
        return <WorkoutLogScreen token={session.accessToken} />;
      case "cardio":
        return <CardioLogScreen token={session.accessToken} />;
      case "progress":
        return <ProgressScreen token={session.accessToken} />;
      case "library":
        return <ExerciseLibraryScreen token={session.accessToken} />;
      case "plans":
        return <TrainingPlansScreen token={session.accessToken} />;
      case "profile":
        return <ProfileGoalsScreen token={session.accessToken} onUserRefresh={(user) => updateUser(user)} />;
      default:
        return null;
    }
  }, [activeTab, session, updateUser]);

  if (!session) {
    if (isLoading) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center"
          }}
        >
          <CircularProgress />
        </Box>
      );
    }
    return <LoginScreen isLoading={isLoading} errorMessage={errorMessage} onLogin={login} onClearError={clearError} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              TrainMate
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {session.user.fullName} • {translateRole(session.user.role)}
            </Typography>
          </Box>
          <Button color="inherit" onClick={logout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Tabs value={activeTab} onChange={(_event, value: ScreenTab) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile>
            {tabs.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>

          <Box>{activeScreen}</Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <AuthSessionProvider>
      <AuthenticatedApp />
    </AuthSessionProvider>
  );
}
