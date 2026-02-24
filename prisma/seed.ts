import "dotenv/config";
import { PrismaClient, TaskPriority } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@local.dev" },
    update: {},
    create: {
      email: "demo@local.dev",
      displayName: "Demo User",
      profile: {
        create: {
          bio: "Cuenta local de pruebas.",
          isPublic: false,
        },
      },
    },
  });

  const list = await prisma.list.upsert({
    where: {
      ownerId_name: {
        ownerId: user.id,
        name: "Inbox",
      },
    },
    update: {},
    create: {
      ownerId: user.id,
      name: "Inbox",
      color: "#4f46e5",
    },
  });

  const existingTask = await prisma.task.findFirst({
    where: {
      ownerId: user.id,
      title: "Configurar DB local",
    },
  });

  if (!existingTask) {
    await prisma.task.create({
      data: {
        ownerId: user.id,
        listId: list.id,
        title: "Configurar DB local",
        description: "Tarea semilla creada para validar Prisma y PostgreSQL.",
        priority: TaskPriority.HIGH,
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
