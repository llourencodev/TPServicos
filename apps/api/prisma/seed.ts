import { config } from "dotenv";
config({ path: "../../.env" });
import { PrismaClient, UserRole } from "@prisma/client";
import * as argon2 from "argon2";

const db = new PrismaClient();
const categories = [
  [
    "Reparos e manutenção",
    "reparos-manutencao",
    "Pequenos consertos e manutenção residencial.",
  ],
  ["Limpeza", "limpeza", "Limpeza residencial, comercial e pós-obra."],
  [
    "Construção e reformas",
    "construcao-reformas",
    "Obras, reformas e acabamentos.",
  ],
  ["Beleza e bem-estar", "beleza-bem-estar", "Cuidados pessoais e bem-estar."],
  [
    "Aulas particulares",
    "aulas-particulares",
    "Aulas e acompanhamento individual.",
  ],
  ["Informática", "informatica", "Suporte técnico e serviços de informática."],
  ["Serviços para eventos", "eventos", "Profissionais e apoio para eventos."],
  ["Serviços automotivos", "automotivo", "Manutenção e serviços automotivos."],
] as const;

async function main() {
  const defaultLeadCost = Number(process.env.DEFAULT_LEAD_CREDIT_COST ?? 5);
  if (
    !Number.isInteger(defaultLeadCost) ||
    defaultLeadCost < 1 ||
    defaultLeadCost > 1000
  ) {
    throw new Error(
      "DEFAULT_LEAD_CREDIT_COST precisa ser um inteiro entre 1 e 1000",
    );
  }
  for (const [name, slug, description] of categories) {
    await db.serviceCategory.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        description,
        leadCost: defaultLeadCost,
      },
    });
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && !password.startsWith("replace-")) {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await db.user.upsert({
      where: { email },
      update: {},
      create: {
        name: "Administrador",
        email,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
  } else {
    console.warn(
      "ADMIN_EMAIL/ADMIN_PASSWORD ausentes ou padrão; o usuário administrador não foi criado.",
    );
  }
}

main().finally(() => db.$disconnect());
