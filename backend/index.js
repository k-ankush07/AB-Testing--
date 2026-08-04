import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import {connectDB} from "./db.js"
import { requireApiKey } from "./middleware/auth.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8001;

app.use("/api", requireApiKey);
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use("/api", requireApiKey);

connectDB();

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`),
);