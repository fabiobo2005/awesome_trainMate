-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` ENUM('STUDENT', 'TRAINER', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `passwordHash` VARCHAR(191) NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_identities` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` ENUM('LOCAL', 'GOOGLE', 'MICROSOFT', 'FACEBOOK') NOT NULL,
    `providerUserId` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_identities_userId_idx`(`userId`),
    UNIQUE INDEX `auth_identities_provider_providerUserId_key`(`provider`, `providerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anamnesis` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `trainingLevel` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NULL,
    `age` INTEGER NULL,
    `heightCm` DECIMAL(5, 2) NULL,
    `weightKg` DECIMAL(6, 2) NULL,
    `bodyFatPct` DECIMAL(5, 2) NULL,
    `injuries` TEXT NULL,
    `limitations` TEXT NULL,
    `medicalNotes` TEXT NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `anamnesis_userId_isCurrent_idx`(`userId`, `isCurrent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goals` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('HYPERTROPHY', 'STRENGTH', 'WEIGHT_LOSS', 'RUN_5K', 'RUN_10K', 'RUN_21K', 'RUN_42K', 'OTHER') NOT NULL,
    `description` TEXT NULL,
    `targetValue` DECIMAL(10, 2) NULL,
    `targetDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `goals_userId_isActive_idx`(`userId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trainers` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bio` TEXT NULL,
    `certification` VARCHAR(191) NULL,
    `experienceYears` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trainers_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trainer_specialties` (
    `id` VARCHAR(191) NOT NULL,
    `trainerProfileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `trainer_specialties_trainerProfileId_name_key`(`trainerProfileId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_trainer_association` (
    `id` VARCHAR(191) NOT NULL,
    `studentUserId` VARCHAR(191) NOT NULL,
    `trainerUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_trainer_association_studentUserId_status_idx`(`studentUserId`, `status`),
    INDEX `user_trainer_association_trainerUserId_status_idx`(`trainerUserId`, `status`),
    UNIQUE INDEX `user_trainer_association_studentUserId_trainerUserId_key`(`studentUserId`, `trainerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_methods` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `abbreviation` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `training_methods_name_key`(`name`),
    UNIQUE INDEX `training_methods_abbreviation_key`(`abbreviation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_library` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `muscleGroup` VARCHAR(191) NOT NULL,
    `equipment` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `instructions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exercise_library_name_key`(`name`),
    INDEX `exercise_library_muscleGroup_idx`(`muscleGroup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_library_methods` (
    `exerciseLibraryId` VARCHAR(191) NOT NULL,
    `trainingMethodId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`exerciseLibraryId`, `trainingMethodId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `monthRef` VARCHAR(191) NULL,
    `assignedUserId` VARCHAR(191) NULL,
    `trainerUserId` VARCHAR(191) NULL,
    `isTemplate` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_blocks_assignedUserId_isActive_idx`(`assignedUserId`, `isActive`),
    INDEX `training_blocks_trainerUserId_idx`(`trainerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_days` (
    `id` VARCHAR(191) NOT NULL,
    `blockId` VARCHAR(191) NOT NULL,
    `dayName` VARCHAR(191) NOT NULL,
    `dayNumber` INTEGER NOT NULL,
    `muscleGroups` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `training_days_blockId_dayNumber_key`(`blockId`, `dayNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_microcycles` (
    `id` VARCHAR(191) NOT NULL,
    `dayId` VARCHAR(191) NOT NULL,
    `microcycleNumber` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `training_microcycles_dayId_microcycleNumber_key`(`dayId`, `microcycleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_exercises` (
    `id` VARCHAR(191) NOT NULL,
    `microcycleId` VARCHAR(191) NOT NULL,
    `exerciseLibraryId` VARCHAR(191) NOT NULL,
    `trainingMethodId` VARCHAR(191) NULL,
    `series` INTEGER NOT NULL,
    `reps` INTEGER NOT NULL,
    `cadence` VARCHAR(191) NULL,
    `restSeconds` INTEGER NULL,
    `observations` TEXT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `training_exercises_exerciseLibraryId_idx`(`exerciseLibraryId`),
    INDEX `training_exercises_trainingMethodId_idx`(`trainingMethodId`),
    UNIQUE INDEX `training_exercises_microcycleId_orderIndex_key`(`microcycleId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `trainingDayId` VARCHAR(191) NULL,
    `sourceType` ENUM('PLAN', 'CUSTOM') NOT NULL DEFAULT 'PLAN',
    `sessionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `durationMinutes` INTEGER NULL,
    `pse` INTEGER NULL,
    `arbitraryUnits` DECIMAL(10, 2) NULL,
    `totalLoadKg` DECIMAL(14, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workout_sessions_userId_sessionDate_idx`(`userId`, `sessionDate`),
    INDEX `workout_sessions_trainingDayId_idx`(`trainingDayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_sets` (
    `id` VARCHAR(191) NOT NULL,
    `workoutSessionId` VARCHAR(191) NOT NULL,
    `exerciseLibraryId` VARCHAR(191) NULL,
    `trainingExerciseId` VARCHAR(191) NULL,
    `setNumber` INTEGER NOT NULL,
    `repsExecuted` INTEGER NOT NULL,
    `weightKg` DECIMAL(10, 2) NULL,
    `loadTotal` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workout_sets_workoutSessionId_idx`(`workoutSessionId`),
    INDEX `workout_sets_exerciseLibraryId_idx`(`exerciseLibraryId`),
    INDEX `workout_sets_trainingExerciseId_idx`(`trainingExerciseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `running_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sessionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `distanceKm` DECIMAL(7, 2) NULL,
    `durationMinutes` INTEGER NULL,
    `pace` VARCHAR(191) NULL,
    `avgHeartRate` INTEGER NULL,
    `pse` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `running_sessions_userId_sessionDate_idx`(`userId`, `sessionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cardio_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sessionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cardioType` ENUM('AEROBIC_CONTINUOUS', 'AEROBIC_LONG', 'HIIT_LONG', 'INTERVAL_TREADMILL', 'OTHER') NOT NULL,
    `equipment` VARCHAR(191) NULL,
    `intensity` VARCHAR(191) NULL,
    `durationMinutes` INTEGER NULL,
    `distanceKm` DECIMAL(7, 2) NULL,
    `pace` VARCHAR(191) NULL,
    `heartRate` INTEGER NULL,
    `pse` INTEGER NULL,
    `intervalsCount` INTEGER NULL,
    `intervalDurationSec` INTEGER NULL,
    `recoverySpeedKmh` DECIMAL(6, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cardio_sessions_userId_sessionDate_idx`(`userId`, `sessionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metrics` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `workoutSessionId` VARCHAR(191) NULL,
    `runningSessionId` VARCHAR(191) NULL,
    `weekStart` DATETIME(3) NULL,
    `monthRef` VARCHAR(191) NULL,
    `avgPse` DECIMAL(6, 2) NULL,
    `totalLoadKg` DECIMAL(14, 2) NULL,
    `totalCardioMinutes` INTEGER NULL,
    `totalDistanceKm` DECIMAL(10, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `metrics_userId_weekStart_monthRef_idx`(`userId`, `weekStart`, `monthRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anamnesis` ADD CONSTRAINT `anamnesis_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainers` ADD CONSTRAINT `trainers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainer_specialties` ADD CONSTRAINT `trainer_specialties_trainerProfileId_fkey` FOREIGN KEY (`trainerProfileId`) REFERENCES `trainers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_trainer_association` ADD CONSTRAINT `user_trainer_association_studentUserId_fkey` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_trainer_association` ADD CONSTRAINT `user_trainer_association_trainerUserId_fkey` FOREIGN KEY (`trainerUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_library_methods` ADD CONSTRAINT `exercise_library_methods_exerciseLibraryId_fkey` FOREIGN KEY (`exerciseLibraryId`) REFERENCES `exercise_library`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_library_methods` ADD CONSTRAINT `exercise_library_methods_trainingMethodId_fkey` FOREIGN KEY (`trainingMethodId`) REFERENCES `training_methods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_blocks` ADD CONSTRAINT `training_blocks_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_blocks` ADD CONSTRAINT `training_blocks_trainerUserId_fkey` FOREIGN KEY (`trainerUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_days` ADD CONSTRAINT `training_days_blockId_fkey` FOREIGN KEY (`blockId`) REFERENCES `training_blocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_microcycles` ADD CONSTRAINT `training_microcycles_dayId_fkey` FOREIGN KEY (`dayId`) REFERENCES `training_days`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exercises` ADD CONSTRAINT `training_exercises_microcycleId_fkey` FOREIGN KEY (`microcycleId`) REFERENCES `training_microcycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exercises` ADD CONSTRAINT `training_exercises_exerciseLibraryId_fkey` FOREIGN KEY (`exerciseLibraryId`) REFERENCES `exercise_library`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_exercises` ADD CONSTRAINT `training_exercises_trainingMethodId_fkey` FOREIGN KEY (`trainingMethodId`) REFERENCES `training_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sessions` ADD CONSTRAINT `workout_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sessions` ADD CONSTRAINT `workout_sessions_trainingDayId_fkey` FOREIGN KEY (`trainingDayId`) REFERENCES `training_days`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_workoutSessionId_fkey` FOREIGN KEY (`workoutSessionId`) REFERENCES `workout_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_exerciseLibraryId_fkey` FOREIGN KEY (`exerciseLibraryId`) REFERENCES `exercise_library`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_trainingExerciseId_fkey` FOREIGN KEY (`trainingExerciseId`) REFERENCES `training_exercises`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `running_sessions` ADD CONSTRAINT `running_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cardio_sessions` ADD CONSTRAINT `cardio_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metrics` ADD CONSTRAINT `metrics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metrics` ADD CONSTRAINT `metrics_workoutSessionId_fkey` FOREIGN KEY (`workoutSessionId`) REFERENCES `workout_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metrics` ADD CONSTRAINT `metrics_runningSessionId_fkey` FOREIGN KEY (`runningSessionId`) REFERENCES `running_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

