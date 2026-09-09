import { afterAll } from "vitest";
import prisma from "../src/config/database.js";

// Fecha a conexão criada pelo Prisma após a execução de todos os testes deste arquivo.
afterAll(async () => {
  await prisma.$disconnect();
});
