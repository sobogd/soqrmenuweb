/**
 * Delete a user by email. Also deletes companies they own if no other user remains.
 * Usage: npx tsx scripts/delete-user.ts <email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx scripts/delete-user.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { companies: { include: { company: true } } },
  });
  if (!user) {
    console.log(`No user with email ${email}`);
    return;
  }

  console.log(`Found user ${user.id} (${user.email})`);
  const companyIds = user.companies.map((c) => c.companyId);
  console.log(`Linked companies: ${companyIds.length}`);

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Deleted user.`);

  for (const cid of companyIds) {
    const remaining = await prisma.userCompany.count({ where: { companyId: cid } });
    if (remaining === 0) {
      await prisma.company.delete({ where: { id: cid } });
      console.log(`Deleted orphaned company ${cid}`);
    } else {
      console.log(`Company ${cid} kept (${remaining} other users)`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
