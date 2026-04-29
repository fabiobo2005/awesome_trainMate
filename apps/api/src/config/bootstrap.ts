import "dotenv/config";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

type SecretBinding = {
  envKey: "DATABASE_URL" | "JWT_SECRET" | "AI_SERVICE_BASE_URL";
  secretNameEnvKey:
    | "KEY_VAULT_DATABASE_URL_SECRET_NAME"
    | "KEY_VAULT_JWT_SECRET_SECRET_NAME"
    | "KEY_VAULT_AI_SERVICE_BASE_URL_SECRET_NAME";
  defaultSecretName: string;
  required: boolean;
};

const secretBindings: SecretBinding[] = [
  {
    envKey: "DATABASE_URL",
    secretNameEnvKey: "KEY_VAULT_DATABASE_URL_SECRET_NAME",
    defaultSecretName: "trainmate-database-url",
    required: true
  },
  {
    envKey: "JWT_SECRET",
    secretNameEnvKey: "KEY_VAULT_JWT_SECRET_SECRET_NAME",
    defaultSecretName: "trainmate-jwt-secret",
    required: true
  },
  {
    envKey: "AI_SERVICE_BASE_URL",
    secretNameEnvKey: "KEY_VAULT_AI_SERVICE_BASE_URL_SECRET_NAME",
    defaultSecretName: "trainmate-ai-service-base-url",
    required: false
  }
];

function isMissingRuntimeValue(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return trimmed.includes("REPLACE_WITH_");
}

function resolveSecretName(binding: SecretBinding): string {
  const candidate = process.env[binding.secretNameEnvKey] ?? binding.defaultSecretName;
  return candidate.trim();
}

export async function bootstrapRuntimeSecrets(): Promise<void> {
  const keyVaultUri = process.env.KEY_VAULT_URI?.trim();
  if (!keyVaultUri) return;

  const credential = new DefaultAzureCredential();
  const secretClient = new SecretClient(keyVaultUri, credential);
  const loadedKeys: string[] = [];

  for (const binding of secretBindings) {
    const currentValue = process.env[binding.envKey];
    if (!isMissingRuntimeValue(currentValue)) continue;

    const secretName = resolveSecretName(binding);
    if (!secretName) {
      if (!binding.required) continue;
      throw new Error(`Missing ${binding.secretNameEnvKey} for required runtime secret ${binding.envKey}.`);
    }

    try {
      const secret = await secretClient.getSecret(secretName);
      const secretValue = secret.value?.trim();
      if (!secretValue) {
        throw new Error(`Key Vault secret '${secretName}' is empty.`);
      }

      process.env[binding.envKey] = secretValue;
      loadedKeys.push(binding.envKey);
    } catch (error) {
      if (!binding.required) continue;

      const reason = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Unable to resolve required secret '${secretName}' for ${binding.envKey}: ${reason}`);
    }
  }

  if (loadedKeys.length > 0) {
    console.log(
      JSON.stringify({
        level: "info",
        event: "runtime-secrets-loaded",
        provider: "azure-key-vault",
        loadedKeys
      })
    );
  }
}
