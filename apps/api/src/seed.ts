import { prisma } from "./index";

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "dev-org" },
    update: {},
    create: {
      id: "dev-org",
      name: "DevOrg",
      users: {
        create: { email: "dev@example.com", password: "PLEASE_LOGIN_VIA_REGISTER", role: "admin" }
      }
    }
  });

  console.log("Seeded org:", org.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
