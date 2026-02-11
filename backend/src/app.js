import express from "express";
import healthRoutes from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);

app.use(errorHandler);

export default app;
