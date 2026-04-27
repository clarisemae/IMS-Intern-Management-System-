import cors from "cors";
import dotenv from "dotenv";
import dashboardRoutes from "./routes/dashboardRoutes";
import express, { NextFunction, Request, Response } from "express";
import analyticsRoutes from "./routes/analyticsRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import authRoutes from "./routes/authRoutes";
import reportRoutes from "./routes/reportRoutes";
import messageRoutes from "./routes/messageRoutes";
import taskRoutes from "./routes/taskRoutes";
import userRoutes from "./routes/userRoutes";
import { cleanupPasswordResetOtps, testDatabaseConnection } from "./config/db";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(
  cors({
    origin: frontendUrl,
    credentials: false,
  }),
);
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/analytics", analyticsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

async function startServer() {
  try {
    await testDatabaseConnection();
    setInterval(() => {
      void cleanupPasswordResetOtps().catch((error) => {
        console.error("Failed to clean up password reset OTPs.", error);
      });
    }, 60 * 60 * 1000);

    app.listen(port, () => {
      console.log(`IMS API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start the API server.", error);
    process.exit(1);
  }
}

startServer();
