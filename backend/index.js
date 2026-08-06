import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./db.js";
import { requireApiKey } from "./middleware/auth.js";
import experimentsRouter from "./routes/experiments.js";
import previewRouter from "./routes/preview.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8001;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.static("public"));

app.use("/api", previewRouter);

app.use("/api", requireApiKey);

app.use("/api", experimentsRouter);

connectDB();

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);