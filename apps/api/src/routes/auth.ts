import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../index";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev";

authRouter.post("/register", async (req, res) => {
  const body = z.object({
    orgName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8)
  }).parse(req.body);

  const passwordHash = await bcrypt.hash(body.password, 10);

  const org = await prisma.organization.create({
    data: {
      name: body.orgName,
      users: { create: { email: body.email, password: passwordHash, role: "admin" } }
    },
    include: { users: true }
  });

  res.json({ orgId: org.id });
});

authRouter.post("/login", async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string()
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = jwt.sign(
    { userId: user.id, orgId: user.orgId, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});
