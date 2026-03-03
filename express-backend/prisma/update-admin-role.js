const { PrismaClient } = require('../src/generated/supabase-client-v5');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@tax.gov';
  const role = 'admin';

  console.log(`Updating role for user ${email} to '${role}'...`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
    });

    console.log(`Successfully updated user: ${updatedUser.email}`);
    console.log(`New role: ${updatedUser.role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
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
