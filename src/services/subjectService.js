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
  createdAt: true,
  updatedAt: true,
  professor: { select: publicUserSelect },
};

export const getAllSubjects = async () => {
  return prisma.subject.findMany({
    select: publicSubjectSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getSubjectById = async (subjectId) => {
  return prisma.subject.findUnique({
    where: { id: subjectId },
    select: publicSubjectSelect,
  });
};

export const createSubject = async (subjectData) => {
  const professor = await prisma.user.findUnique({
    where: { id: subjectData.professorId },
    select: { id: true },
  });

  if (!professor) {
    return { ok: false, reason: "PROFESSOR_NOT_FOUND" };
  }

  const subject = await prisma.subject.create({
    data: {
      nome: subjectData.nome.trim(),
      professorId: subjectData.professorId,
      ativa: subjectData.ativa ?? true,
    },
    select: publicSubjectSelect,
  });

  return { ok: true, data: subject };
};

export const updateSubject = async (subjectId, subjectData) => {
  const subjectExists = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!subjectExists) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (Object.hasOwn(subjectData, "professorId")) {
    const professor = await prisma.user.findUnique({
      where: { id: subjectData.professorId },
      select: { id: true },
    });

    if (!professor) {
      return { ok: false, reason: "PROFESSOR_NOT_FOUND" };
    }
  }

  const data = {};

  if (Object.hasOwn(subjectData, "nome")) {
    data.nome = subjectData.nome.trim();
  }

  if (Object.hasOwn(subjectData, "ativa")) {
    data.ativa = subjectData.ativa;
  }

  if (Object.hasOwn(subjectData, "professorId")) {
    data.professorId = subjectData.professorId;
  }

  const subject = await prisma.subject.update({
    where: { id: subjectId },
    data,
    select: publicSubjectSelect,
  });

  return { ok: true, data: subject };
};

export const deleteSubject = async (subjectId) => {
  const subjectExists = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      _count: { select: { questions: true } },
    },
  });

  if (!subjectExists) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (subjectExists._count.questions > 0) {
    return { ok: false, reason: "SUBJECT_IN_USE" };
  }

  try {
    const subject = await prisma.subject.delete({
      where: { id: subjectId },
      select: publicSubjectSelect,
    });

    return { ok: true, data: subject };
  } catch (error) {
    if (error.code === "P2003" || error.code === "P2014") {
      return { ok: false, reason: "SUBJECT_IN_USE" };
    }

    if (error.code === "P2025") {
      return { ok: false, reason: "NOT_FOUND" };
    }

    throw error;
  }
};
