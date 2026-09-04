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

async function relatedRecordsExist({ subjectId, authorId }) {
  if (subjectId !== undefined) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });

    if (!subject) {
      return { ok: false, reason: "SUBJECT_NOT_FOUND" };
    }
  }

  if (authorId !== undefined) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true },
    });

    if (!author) {
      return { ok: false, reason: "AUTHOR_NOT_FOUND" };
    }
  }

  return { ok: true };
}

export const getAllQuestions = async () => {
  return prisma.question.findMany({
    select: publicQuestionSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getQuestionById = async (questionId) => {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: publicQuestionSelect,
  });
};

export const createQuestion = async (questionData) => {
  const relations = await relatedRecordsExist(questionData);

  if (!relations.ok) {
    return relations;
  }

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

  return { ok: true, data: question };
};

export const updateQuestion = async (questionId, questionData) => {
  const questionExists = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questionExists) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const relations = await relatedRecordsExist(questionData);

  if (!relations.ok) {
    return relations;
  }

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

  return { ok: true, data: question };
};

export const deleteQuestion = async (questionId) => {
  const questionExists = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questionExists) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  try {
    const question = await prisma.question.delete({
      where: { id: questionId },
      select: publicQuestionSelect,
    });

    return { ok: true, data: question };
  } catch (error) {
    if (error.code === "P2025") {
      return { ok: false, reason: "NOT_FOUND" };
    }

    throw error;
  }
};
