import { Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from "@mui/material";
import { type FormEvent, useState } from "react";

type LoginScreenProps = {
  isLoading: boolean;
  errorMessage: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onClearError: () => void;
};

const quickAccounts = [
  { label: "Aluno", email: "aluno@trainmate.local", password: "123456" },
  { label: "Treinador", email: "trainer@trainmate.local", password: "123456" },
  { label: "Administrador", email: "admin@trainmate.local", password: "123456" }
];

export function LoginScreen({ isLoading, errorMessage, onLogin, onClearError }: LoginScreenProps) {
  const [email, setEmail] = useState("aluno@trainmate.local");
  const [password, setPassword] = useState("123456");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      await onLogin(email, password);
    } catch {
      // The context already exposes the formatted error message.
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 520 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                TrainMate
              </Typography>
              <Typography color="text.secondary">Acesse para registrar treinos, cardio, progresso e planos.</Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {quickAccounts.map((account) => (
                <Chip
                  key={account.email}
                  label={account.label}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    onClearError();
                  }}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>

            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
              <Stack spacing={2}>
                <TextField
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errorMessage) onClearError();
                  }}
                  required
                  fullWidth
                />
                <TextField
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errorMessage) onClearError();
                  }}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
