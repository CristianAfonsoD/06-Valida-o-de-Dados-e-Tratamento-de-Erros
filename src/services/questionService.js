import prisma from "../config/database.js";
import { NotFoundError } from "../errors/AppError.js";

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

const publicQuestionSelect = {
  id: true,
  enunciado: true,
  dificuldade: true,
  respostaCorreta: true,
  ativa: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: publicSubjectSelect },
  author: { select: publicUserSelect },
};

/**
 * Verifica se as relações informadas existem.
 *
 * @param {{subjectId?: number, authorId?: number}} data
 * @throws {NotFoundError} Quando uma relação não existe.
 */
async function validateRelations({ subjectId, authorId }) {
  if (subjectId !== undefined) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundError("Matéria não encontrada");
    }
  }

  if (authorId !== undefined) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true },
    });

    if (!author) {
      throw new NotFoundError("Autor não encontrado");
    }
  }
}

/**
 * Lista todas as questões.
 *
 * @returns {Promise<Array>}
 */
export const getAllQuestions = async () => {
  return prisma.question.findMany({
    select: publicQuestionSelect,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Busca uma questão pelo ID.
 *
 * @param {number} questionId
 * @returns {Promise<Object|null>}
 */
export const getQuestionById = async (questionId) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: publicQuestionSelect,
  });

  if (!question) {
    throw new NotFoundError("Questão não encontrada");
  }

  return question;
};

/**
 * Cria uma questão.
 *
 * @param {Object} questionData
 * @returns {Promise<{ok: boolean, data: Object}>}
 * @throws {NotFoundError} Quando matéria ou autor não existe.
 */
export const createQuestion = async (questionData) => {
  await validateRelations(questionData);

  const question = await prisma.question.create({
    data: {
      enunciado: questionData.enunciado.trim(),
      dificuldade: questionData.dificuldade,
      respostaCorreta: questionData.respostaCorreta?.trim() || null,
      subjectId: questionData.subjectId,
      authorId: questionData.authorId,
      ativa: questionData.ativa ?? true,
    },
    select: publicQuestionSelect,
  });

  return {
    ok: true,
    data: question,
  };
};

/**
 * Atualiza parcialmente uma questão.
 *
 * @param {number} questionId
 * @param {Object} questionData
 * @returns {Promise<{ok: boolean, data: Object}>}
 * @throws {NotFoundError} Quando a questão ou uma relação não existe.
 */
export const updateQuestion = async (questionId, questionData) => {
  const questionExists = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questionExists) {
    throw new NotFoundError("Questão não encontrada");
  }

  await validateRelations(questionData);

  const data = {};

  if (Object.hasOwn(questionData, "enunciado")) {
    data.enunciado = questionData.enunciado.trim();
  }

  if (Object.hasOwn(questionData, "dificuldade")) {
    data.dificuldade = questionData.dificuldade;
  }

  if (Object.hasOwn(questionData, "respostaCorreta")) {
    data.respostaCorreta = questionData.respostaCorreta?.trim() || null;
  }

  if (Object.hasOwn(questionData, "subjectId")) {
    data.subjectId = questionData.subjectId;
  }

  if (Object.hasOwn(questionData, "authorId")) {
    data.authorId = questionData.authorId;
  }

  if (Object.hasOwn(questionData, "ativa")) {
    data.ativa = questionData.ativa;
  }

  const question = await prisma.question.update({
    where: { id: questionId },
    data,
    select: publicQuestionSelect,
  });

  return {
    ok: true,
    data: question,
  };
};

/**
 * Remove uma questão.
 *
 * @param {number} questionId
 * @returns {Promise<{ok: boolean, data: Object}>}
 * @throws {NotFoundError} Quando a questão não existe.
 */
export const deleteQuestion = async (questionId) => {
  const questionExists = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questionExists) {
    throw new NotFoundError("Questão não encontrada");
  }

  try {
    const question = await prisma.question.delete({
      where: { id: questionId },
      select: publicQuestionSelect,
    });

    return {
      ok: true,
      data: question,
    };
  } catch (error) {
    if (error.code === "P2025") {
      throw new NotFoundError("Questão não encontrada");
    }

    throw error;
  }
};
