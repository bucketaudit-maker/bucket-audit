import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index";
import { requireAuth } from "../mw/auth";

export const accountRouter = Router();
accountRouter.use(requireAuth);

accountRouter.post("/", async (req, res) => {
  const { orgId } = (req as any).auth;

  const body = z.object({
    provider: z.literal("aws"),
    displayName: z.string().min(2),
    roleArn: z.string().min(20),
    externalId: z.string().optional()
  }).parse(req.body);

  const created = await prisma.cloudAccount.create({ data: { orgId, ...body } });
  res.json(created);
});

accountRouter.get("/", async (req, res) => {
  const { orgId } = (req as any).auth;
  const rows = await prisma.cloudAccount.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" }
  });
  res.json(rows);
});
