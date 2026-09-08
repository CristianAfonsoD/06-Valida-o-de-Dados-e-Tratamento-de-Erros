import prisma from "../config/database.js";

const publicUserSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  foto: true,
};

const publicSubjectSelect = {
  id: true,
  nome: true,
  ativa: true,
};

function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export const create = async (req, res) => {
  try {
    const {
      enunciado,
      dificuldade,
      respostaCorreta,
      subjectId,
      authorId,
      ativa,
    } = req.body;
    const subjectIdNumber = toPositiveInt(subjectId);
    const authorIdNumber = toPositiveInt(authorId);
    const difficultyNumber = Number(dificuldade);

    if (
      typeof enunciado !== "string" ||
      !enunciado.trim() ||
      !subjectIdNumber ||
      !authorIdNumber ||
      !Number.isInteger(difficultyNumber) ||
      difficultyNumber < 1 ||
      difficultyNumber > 3
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enunciado, dificuldade entre 1 e 3, subjectId e authorId válidos são obrigatórios",
      });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectIdNumber },
      select: { id: true },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectIdNumber} não encontrada`,
      });
    }

    const author = await prisma.user.findUnique({
      where: { id: authorIdNumber },
      select: { id: true },
    });

    if (!author) {
      return res.status(404).json({
        success: false,
        message: `Autor com ID ${authorIdNumber} não encontrado`,
      });
    }

    const novaQuestao = await prisma.question.create({
      data: {
        enunciado: enunciado.trim(),
        dificuldade: difficultyNumber,
        respostaCorreta: respostaCorreta?.trim() || null,
        subjectId: subjectIdNumber,
        authorId: authorIdNumber,
        ativa: ativa ?? true,
      },
      select: {
        id: true,
        enunciado: true,
        dificuldade: true,
        respostaCorreta: true,
        ativa: true,
        createdAt: true,
        subject: { select: publicSubjectSelect },
        author: { select: publicUserSelect },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Questão criada com sucesso",
      data: novaQuestao,
    });
  } catch (error) {
    console.error("Erro ao criar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar questão",
    });
  }
};

export const getAll = async (_req, res) => {
  try {
    const questoes = await prisma.question.findMany({
      select: {
        id: true,
        enunciado: true,
        dificuldade: true,
        respostaCorreta: true,
        ativa: true,
        createdAt: true,
        subject: { select: publicSubjectSelect },
        author: { select: publicUserSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: questoes,
      total: questoes.length,
    });
  } catch (error) {
    console.error("Erro ao listar questões:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar questões",
    });
  }
};

export const getById = async (req, res) => {
  try {
    const questionId = toPositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const questao = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        enunciado: true,
        dificuldade: true,
        respostaCorreta: true,
        ativa: true,
        createdAt: true,
        subject: { select: publicSubjectSelect },
        author: { select: publicUserSelect },
      },
    });

    if (!questao) {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    return res.status(200).json({
      success: true,
      data: questao,
    });
  } catch (error) {
    console.error("Erro ao buscar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar questão",
    });
  }
};
