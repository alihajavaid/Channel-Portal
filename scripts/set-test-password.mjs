import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const email = process.argv[2];
const password = process.argv[3];
const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
const updated = await prisma.user.update({
  where: { email },
  data: { passwordHash, mustChangePassword: false },
});
console.log("Password set for", updated.email);
await prisma.$disconnect();
