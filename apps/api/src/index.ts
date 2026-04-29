import { bootstrapRuntimeSecrets } from "./config/bootstrap.js";

async function startServer(): Promise<void> {
  await bootstrapRuntimeSecrets();

  const [{ app }, { env }, { prisma }, { log }] = await Promise.all([
    import("./app.js"),
    import("./config/env.js"),
    import("./db/prisma.js"),
    import("./observability/logger.js")
  ]);

  const server = app.listen(env.PORT, () => {
    log("info", "trainmate-api started", { port: env.PORT });
  });

  async function shutdown(signal: string): Promise<void> {
    log("info", "trainmate-api shutdown requested", { signal });
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void startServer().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "trainmate-api startup failed",
      reason: message
    })
  );
  process.exit(1);
});
