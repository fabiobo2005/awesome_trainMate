import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "trainmate-api",
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

