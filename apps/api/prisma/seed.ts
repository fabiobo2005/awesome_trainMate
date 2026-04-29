import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AssociationStatus, AuthProvider, PrismaClient, UserRole, UserStatus } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const PLAN_FILE_NAMES = [
  "JANEIRO2026.xlsx",
  "Julho2025.xlsx",
  "Maio2026.xlsx",
  "Novembro2025.xlsx",
  "setembro2025.xlsx"
] as const;

const TARGET_SHEETS = new Set(["amarelo", "verde", "vermelho", "laranja", "azul"]);

const ROW_SKIP_PATTERNS = [
  "exercicios",
  "exercícios",
  "percepcao subjetiva",
  "percepção subjetiva",
  "tempo da sessao",
  "tempo da sessão",
  "unidades arbitrarias",
  "unidades arbitrárias",
  "carga total da sessao",
  "carga total da sessão",
  "semana",
  "microciclo",
  "treino",
  "alternado por grupo muscular"
] as const;

const TRAINING_METHODS = [
  {
    key: "BI_SET",
    name: "BI-SET",
    abbreviation: "BI-SET",
    description: "Dois exercícios em sequência sem descanso entre eles; o descanso ocorre ao final do segundo exercício."
  },
  {
    key: "TRI_SET",
    name: "TRI-SET",
    abbreviation: "TRI-SET",
    description: "Três exercícios em sequência sem descanso entre eles."
  },
  {
    key: "SUPER_SERIE",
    name: "SUPER SÉRIE",
    abbreviation: "SUPER",
    description: "Quatro exercícios para o mesmo grupamento muscular sem descanso, seguidos de intervalo de recuperação."
  },
  {
    key: "PIRAMIDE_CRESCENTE",
    name: "PIRÂMIDE CRESCENTE",
    abbreviation: "PIRAM.CRESC",
    description: "Séries múltiplas com aumento de carga e redução de repetições."
  },
  {
    key: "PIRAMIDE_DECRESCENTE",
    name: "PIRÂMIDE DECRESCENTE",
    abbreviation: "PIRAM.DEC",
    description: "Séries múltiplas com redução de carga e aumento de repetições."
  },
  {
    key: "SERIES_MULTIPLAS",
    name: "SÉRIES MÚLTIPLAS",
    abbreviation: "SM",
    description: "Séries repetidas com a mesma carga e volume."
  },
  {
    key: "DROP_SET",
    name: "DROP-SET",
    abbreviation: "DROP",
    description: "Após atingir o limite de repetições, reduzir de 20% a 40% da carga e continuar até a falha."
  },
  {
    key: "SERIE_DE_SAIDA",
    name: "SÉRIE DE SAÍDA",
    abbreviation: "SAIDA",
    description: "Última série com redução de 50% da carga executada até a falha concêntrica."
  },
  {
    key: "PONTO_ZERO",
    name: "PONTO ZERO",
    abbreviation: "P0",
    description: "Pausa isométrica no ponto de maior alongamento muscular."
  },
  {
    key: "ONDULATORIO",
    name: "ONDULATÓRIO",
    abbreviation: "OND",
    description: "Variação de repetições e peso dentro da mesma sequência."
  },
  {
    key: "EXAUSTAO",
    name: "EXAUSTÃO",
    abbreviation: "EXAUST",
    description: "Todas as séries até a falha concêntrica momentânea."
  },
  {
    key: "EXCENTRICO",
    name: "EXCÊNTRICO",
    abbreviation: "EXC",
    description: "Fase excêntrica executada pelo aluno e fase concêntrica assistida."
  },
  {
    key: "REPETICOES_FORCADAS",
    name: "REPETIÇÕES FORÇADAS",
    abbreviation: "FORC",
    description: "Após a falha natural, realizar repetições forçadas com auxílio."
  },
  {
    key: "GVT",
    name: "GVT",
    abbreviation: "GVT",
    description: "Método 10x10 com carga aproximada de 60% de 1RM e intervalos curtos."
  },
  {
    key: "REST_PAUSE",
    name: "REST-PAUSE",
    abbreviation: "REST",
    description: "Série até falha com curtos descansos intermediários sem redução de carga."
  },
  {
    key: "FST_7",
    name: "FST-7",
    abbreviation: "FST7",
    description: "Sete séries com descansos de 30 a 45 segundos para estímulo de fáscia."
  },
  {
    key: "SST",
    name: "SST",
    abbreviation: "SST",
    description: "Série máxima com curtos descansos e redução progressiva de carga."
  },
  {
    key: "SISTEMA_3_7",
    name: "SISTEMA 3/7",
    abbreviation: "3/7",
    description: "Progressão de repetições de 3 a 7 com a mesma carga e descansos curtos."
  },
  {
    key: "PICO_CONTRACAO",
    name: "PICO DE CONTRAÇÃO",
    abbreviation: "PICO CONTR",
    description: "Pausa isométrica no pico da contração muscular."
  },
  {
    key: "PICO_ALONGAMENTO",
    name: "PICO DE ALONGAMENTO",
    abbreviation: "PICO ALONG",
    description: "Pausa isométrica no ponto de máximo alongamento muscular."
  }
] as const;

type MethodKey = (typeof TRAINING_METHODS)[number]["key"];

type ExerciseSeed = {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string | null;
  methodKeys: Set<MethodKey>;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMatch(value: string): string {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeExerciseName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function shouldSkipExerciseName(name: string): boolean {
  const normalized = normalizeMatch(name).toLowerCase();
  return ROW_SKIP_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function inferEquipment(name: string): string {
  const n = normalizeMatch(name);
  if (n.includes("HALTER")) return "Halteres";
  if (n.includes("BARRA")) return "Barra";
  if (n.includes("MAQUINA")) return "Máquina";
  if (n.includes("POLIA") || n.includes("CABO")) return "Polia/Cabo";
  if (n.includes("LEG PRESS")) return "Leg Press";
  if (n.includes("TRX")) return "TRX";
  if (n.includes("BANCO")) return "Banco";
  return "Livre";
}

function inferMuscleGroup(sheetName: string, exerciseName: string): string {
  const n = normalizeMatch(exerciseName);
  if (n.includes("TRICEP") || n.includes("FRANCES") || n.includes("COICE") || n.includes("PULLEY") || n.includes("ARREMESSO")) return "Tríceps";
  if (n.includes("ROSCA")) return "Bíceps";
  if (n.includes("PANTURRILHA")) return "Panturrilha";
  if (n.includes("ABD") || n.includes("PRANCHA") || n.includes("ROLINHO") || n.includes("CRUNCH")) return "Core";
  if (n.includes("PUXADA") || n.includes("REMADA") || n.includes("PULLDOWN") || n.includes("BARRA FIXA")) return "Costas";
  if (
    n.includes("AGACHAMENTO") ||
    n.includes("CADEIRA") ||
    n.includes("LEG PRESS") ||
    n.includes("STIFF") ||
    n.includes("FLEXORA") ||
    n.includes("EXTENSORA") ||
    n.includes("TERRA") ||
    n.includes("NORDICA") ||
    n.includes("SUMO") ||
    n.includes("ADUTORA") ||
    n.includes("ABDUTORA")
  ) {
    return "Pernas";
  }
  if (n.includes("PUNHO")) return "Antebraço";
  if (
    n.includes("DESENVOLVIMENTO") ||
    n.includes("ELEVACAO") ||
    n.includes("FACEPULL") ||
    n.includes("ENCOLHIMENTO") ||
    n.includes("OMBRO")
  ) {
    return "Ombro";
  }
  if (n.includes("SUPINO") || n.includes("CROSS OVER") || n.includes("CRUCIFIXO") || n.includes("VOADOR") || n.includes("PUSH UP")) {
    return "Peito";
  }

  const defaults: Record<string, string> = {
    amarelo: "Peito",
    verde: "Costas",
    vermelho: "Pernas",
    laranja: "Peito",
    azul: "Costas"
  };
  return defaults[sheetName.toLowerCase()] ?? "Geral";
}

function resolveMethodKeys(raw?: string | null): MethodKey[] {
  if (!raw) return [];
  const n = normalizeMatch(raw);
  const keys = new Set<MethodKey>();

  if (n.includes("BI SET")) keys.add("BI_SET");
  if (n.includes("TRI SET")) keys.add("TRI_SET");
  if (n.includes("SUPER SERIE")) keys.add("SUPER_SERIE");
  if (n.includes("PIRAM") && n.includes("CRESC")) keys.add("PIRAMIDE_CRESCENTE");
  if (n.includes("PIRAM") && n.includes("DECRES")) keys.add("PIRAMIDE_DECRESCENTE");
  if (n.includes("SERIES M")) keys.add("SERIES_MULTIPLAS");
  if (n.includes("DROP")) keys.add("DROP_SET");
  if (n.includes("SAIDA")) keys.add("SERIE_DE_SAIDA");
  if (n.includes("PONTO ZERO")) keys.add("PONTO_ZERO");
  if (n.includes("ONDUL")) keys.add("ONDULATORIO");
  if (n.includes("EXAUST")) keys.add("EXAUSTAO");
  if (n.includes("EXCENTR")) keys.add("EXCENTRICO");
  if (n.includes("FORC")) keys.add("REPETICOES_FORCADAS");
  if (n.includes("GVT")) keys.add("GVT");
  if (n.includes("REST") && n.includes("PAUSE")) keys.add("REST_PAUSE");
  if (n.includes("FST")) keys.add("FST_7");
  if (n.includes("SST")) keys.add("SST");
  if (n.includes("3/7") || n.includes("3 7")) keys.add("SISTEMA_3_7");
  if (n.includes("PICO") && n.includes("CONTR")) keys.add("PICO_CONTRACAO");
  if (n.includes("PICO") && n.includes("ALONG")) keys.add("PICO_ALONGAMENTO");

  return [...keys];
}

function parseExercisesFromPlans(repoRoot: string): Map<string, ExerciseSeed> {
  const exerciseMap = new Map<string, ExerciseSeed>();

  for (const fileName of PLAN_FILE_NAMES) {
    const filePath = path.join(repoRoot, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo de plano não encontrado: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath, { cellDates: true });
    for (const sheetName of workbook.SheetNames) {
      if (!TARGET_SHEETS.has(sheetName.toLowerCase())) continue;

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, {
        header: 1,
        raw: true,
        defval: null
      });

      for (const row of rows) {
        const rawName = typeof row[0] === "string" ? row[0] : "";
        const series = Number(row[1]);
        const reps = Number(row[2]);
        if (!rawName || !Number.isFinite(series) || !Number.isFinite(reps)) continue;

        const name = sanitizeExerciseName(rawName);
        if (!name || shouldSkipExerciseName(name)) continue;

        const methodCell = typeof row[5] === "string" ? row[5] : null;
        const observationCell = typeof row[6] === "string" ? row[6] : null;
        const methodKeys = [...resolveMethodKeys(methodCell), ...resolveMethodKeys(observationCell)];
        const muscleGroup = inferMuscleGroup(sheetName, name);
        const equipment = inferEquipment(name);
        const instructions = observationCell ? observationCell.trim() : null;

        const existing = exerciseMap.get(name);
        if (!existing) {
          exerciseMap.set(name, {
            name,
            muscleGroup,
            equipment,
            instructions,
            methodKeys: new Set(methodKeys)
          });
          continue;
        }

        for (const key of methodKeys) {
          existing.methodKeys.add(key);
        }

        if (!existing.instructions && instructions) {
          existing.instructions = instructions;
        }

        if (existing.muscleGroup === "Geral" && muscleGroup !== "Geral") {
          existing.muscleGroup = muscleGroup;
        }

        if (existing.equipment === "Livre" && equipment !== "Livre") {
          existing.equipment = equipment;
        }
      }
    }
  }

  if (exerciseMap.size !== 136) {
    throw new Error(`Esperado 136 exercícios únicos, mas foram encontrados ${exerciseMap.size}.`);
  }

  return exerciseMap;
}

function hashPassword(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function seedUsers(): Promise<void> {
  const defaultPasswordHash = hashPassword("123456");

  const admin = await prisma.user.upsert({
    where: { email: "admin@trainmate.local" },
    update: {
      fullName: "TrainMate Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: true
    },
    create: {
      email: "admin@trainmate.local",
      fullName: "TrainMate Admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: true
    }
  });

  const trainer = await prisma.user.upsert({
    where: { email: "trainer@trainmate.local" },
    update: {
      fullName: "TrainMate Trainer",
      role: UserRole.TRAINER,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: true
    },
    create: {
      email: "trainer@trainmate.local",
      fullName: "TrainMate Trainer",
      role: UserRole.TRAINER,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: true
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "aluno@trainmate.local" },
    update: {
      fullName: "TrainMate Aluno",
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: true
    },
    create: {
      email: "aluno@trainmate.local",
      fullName: "TrainMate Aluno",
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash: defaultPasswordHash,
      mustChangePassword: true
    }
  });

  const identityInputs = [
    { userId: admin.id, providerUserId: admin.email },
    { userId: trainer.id, providerUserId: trainer.email },
    { userId: student.id, providerUserId: student.email }
  ];

  for (const input of identityInputs) {
    await prisma.authIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.LOCAL,
          providerUserId: input.providerUserId
        }
      },
      update: {
        userId: input.userId,
        passwordHash: defaultPasswordHash,
        isPrimary: true
      },
      create: {
        userId: input.userId,
        provider: AuthProvider.LOCAL,
        providerUserId: input.providerUserId,
        passwordHash: defaultPasswordHash,
        isPrimary: true
      }
    });
  }

  const trainerProfile = await prisma.trainerProfile.upsert({
    where: { userId: trainer.id },
    update: {
      certification: "CREF - PENDENTE",
      experienceYears: 5
    },
    create: {
      userId: trainer.id,
      certification: "CREF - PENDENTE",
      experienceYears: 5
    }
  });

  const specialties = ["Hipertrofia", "Treinamento de Força", "Treinamento Cardiorrespiratório"];
  for (const specialtyName of specialties) {
    await prisma.trainerSpecialty.upsert({
      where: {
        trainerProfileId_name: {
          trainerProfileId: trainerProfile.id,
          name: specialtyName
        }
      },
      update: {},
      create: {
        trainerProfileId: trainerProfile.id,
        name: specialtyName
      }
    });
  }

  await prisma.userTrainerAssociation.upsert({
    where: {
      studentUserId_trainerUserId: {
        studentUserId: student.id,
        trainerUserId: trainer.id
      }
    },
    update: {
      status: AssociationStatus.ACTIVE
    },
    create: {
      studentUserId: student.id,
      trainerUserId: trainer.id,
      status: AssociationStatus.ACTIVE
    }
  });
}

async function seedMethodsAndExercises(repoRoot: string): Promise<void> {
  const exerciseMap = parseExercisesFromPlans(repoRoot);
  const methodsByKey = new Map<MethodKey, { id: string }>();

  for (const method of TRAINING_METHODS) {
    const saved = await prisma.trainingMethod.upsert({
      where: { name: method.name },
      update: {
        abbreviation: method.abbreviation,
        description: method.description
      },
      create: {
        name: method.name,
        abbreviation: method.abbreviation,
        description: method.description
      }
    });
    methodsByKey.set(method.key, { id: saved.id });
  }

  const exercises = [...exerciseMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  for (const exercise of exercises) {
    const savedExercise = await prisma.exerciseLibrary.upsert({
      where: { name: exercise.name },
      update: {
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        instructions: exercise.instructions
      },
      create: {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        instructions: exercise.instructions
      }
    });

    for (const methodKey of exercise.methodKeys) {
      const method = methodsByKey.get(methodKey);
      if (!method) continue;

      await prisma.exerciseLibraryMethod.upsert({
        where: {
          exerciseLibraryId_trainingMethodId: {
            exerciseLibraryId: savedExercise.id,
            trainingMethodId: method.id
          }
        },
        update: {},
        create: {
          exerciseLibraryId: savedExercise.id,
          trainingMethodId: method.id
        }
      });
    }
  }

  console.log(`Seed de exercícios concluído: ${exercises.length} exercícios e ${TRAINING_METHODS.length} métodos.`);
}

async function main(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..", "..");

  await seedUsers();
  await seedMethodsAndExercises(repoRoot);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

