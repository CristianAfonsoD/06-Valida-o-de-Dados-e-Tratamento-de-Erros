//src/app.js
import express from "express";
import prisma from "./config/database.js";
import questionRoutes from "./routes/questionRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "OK",
      message: "API do Gerador de Provas",
      timestamp: new Date().toISOString(),
      services: {
        api: "OK",
        database: { status: "OK" },
      },
    });
  } catch (error) {
    console.error("Erro na verificação do banco:", error);

    res.status(503).json({
      status: "DEGRADED",
      message: "API do Gerador de Provas",
      services: {
        api: "OK",
        database: { status: "ERROR" },
      },
    });
  }
});

app.use("/users", userRoutes);
app.use("/subjects", subjectRoutes);
app.use("/questions", questionRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota " + req.method + " " + req.originalUrl + " não encontrada",
  });
});

export default app;
