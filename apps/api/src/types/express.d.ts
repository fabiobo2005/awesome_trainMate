declare namespace Express {
  interface Request {
    requestId?: string;
    auth?: {
      userId: string;
      role: "STUDENT" | "TRAINER" | "ADMIN";
      email: string;
    };
  }
}

