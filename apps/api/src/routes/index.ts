import { Router } from "express";
import { aiRouter } from "./ai.js";
import { authRouter } from "./auth.js";
import { catalogRouter } from "./catalog.js";
import { plansRouter } from "./plans.js";
import { profileRouter } from "./profile.js";
import { progressRouter } from "./progress.js";
import { runsRouter } from "./runs.js";
import { workoutsRouter } from "./workouts.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/plans", plansRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/workouts", workoutsRouter);
apiRouter.use("/runs", runsRouter);
apiRouter.use("/progress", progressRouter);

