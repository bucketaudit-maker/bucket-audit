import { Router } from "express";
import { requireAuth } from "../mw/auth";
import { searchBuckets } from "../search/opensearch";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/", async (req, res) => {
  const { orgId } = (req as any).auth;
  const q = String(req.query.q || "").trim();
  const hits = await searchBuckets(orgId, q);
  res.json({ hits });
});
