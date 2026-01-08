import { Router } from "express";
import { prisma } from "../index";
import { requireAuth } from "../mw/auth";

export const bucketRouter = Router();
bucketRouter.use(requireAuth);

bucketRouter.get("/", async (req, res) => {
  const { orgId } = (req as any).auth;
  const accountId = req.query.accountId ? String(req.query.accountId) : undefined;

  const buckets = await prisma.bucket.findMany({
    where: { orgId, ...(accountId ? { accountId } : {}) },
    include: { findings: { where: { status: "open" } } },
    orderBy: { lastSeenAt: "desc" },
    take: 200
  });

  res.json(buckets);
});
