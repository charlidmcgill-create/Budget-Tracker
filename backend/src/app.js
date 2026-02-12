import express from "express";
import healthRoutes from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);

app.use(errorHandler);

export default app;

//POST /auth/login
//POST /auth/register
//Post /imports
//GET /transactions
//GET /summary/monthly
//PUT /transactions/:id
//DELETE /transactions/:id
//POST /transactions/batch  