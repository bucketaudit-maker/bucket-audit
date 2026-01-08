import express from "express";
import { PrismaClient } from "@prisma/client";
import { authRouter } from "./routes/auth";
import { accountRouter } from "./routes/accounts";
import { bucketRouter } from "./routes/buckets";
import { searchRouter } from "./routes/search";
import { ensureOpenSearch } from "./search/opensearch";

const app = express();
app.use(express.json());

export const prisma = new PrismaClient();

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/accounts", accountRouter);
app.use("/buckets", bucketRouter);
app.use("/search", searchRouter);

const port = Number(process.env.API_PORT || 4000);

ensureOpenSearch().then(() => {
  app.listen(port, () => console.log(`API listening on :${port}`));
}).catch((e) => {
  console.error("Failed to init OpenSearch:", e);
  process.exit(1);
});
