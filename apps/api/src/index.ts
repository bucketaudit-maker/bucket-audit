import express from "express";
import { PrismaClient } from "@prisma/client";
import { authRouter } from "./routes/auth";
import { accountRouter } from "./routes/accounts";
import { bucketRouter } from "./routes/buckets";
import { searchRouter } from "./routes/search";
import { ensureOpenSearch } from "./search/opensearch";
import type { Request, Response } from "express";
import cors from "cors";
import { devRouter } from "./routes/dev";

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

export const prisma = new PrismaClient();

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/accounts", accountRouter);
app.use("/buckets", bucketRouter);
app.use("/search", searchRouter);
app.use("/dev", devRouter);

const port = Number(process.env.API_PORT || 4000);

ensureOpenSearch().then(() => {
  app.listen(port, () => console.log(`API listening on :${port}`));
}).catch((e) => {
  console.error("Failed to init OpenSearch:", e);
  process.exit(1);
});
