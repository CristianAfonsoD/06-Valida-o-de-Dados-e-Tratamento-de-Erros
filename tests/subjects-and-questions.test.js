import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const createdUserIds = [];
const createdSubjectIds = [];
const createdQuestionIds = [];

function uniqueEmail(label) {
  return `atividade05-${label}-${Date.now()}-${Math.random()}@example.com`;
}

async function createUser(overrides = {}) {
  const response = await request(app)
    .post("/users")
    .send({
      nome: "Prof. Atividade",
      email: uniqueEmail("user"),
      ...overrides,
    });

  expect(response.status).toBe(201);
  createdUserIds.push(response.body.data.id);
  return response.body.data;
}

async function createSubject(professorId, overrides = {}) {
  const response = await request(app)
    .post("/subjects")
    .send({
      nome: "Programação Web II",
      professorId,
      ...overrides,
    });

  expect(response.status).toBe(201);
  createdSubjectIds.push(response.body.data.id);
  return response.body.data;
}

async function createQuestion(subjectId, authorId, overrides = {}) {
  const response = await request(app)
    .post("/questions")
    .send({
      enunciado: "O que é uma API REST?",
      dificuldade: 2,
      respostaCorreta: "Uma API baseada nas restrições de REST.",
      subjectId,
      authorId,
      ...overrides,
    });

  expect(response.status).toBe(201);
  createdQuestionIds.push(response.body.data.id);
  return response.body.data;
}

afterEach(async () => {
  if (createdQuestionIds.length > 0) {
    await prisma.question.deleteMany({
      where: { id: { in: createdQuestionIds.splice(0) } },
    });
  }

  if (createdSubjectIds.length > 0) {
    await prisma.subject.deleteMany({
      where: { id: { in: createdSubjectIds.splice(0) } },
    });
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

describe("Subject API", () => {
  it("retorna 404 ao criar matéria com professor inexistente", async () => {
    const response = await request(app).post("/subjects").send({
      nome: "Matéria sem professor",
      professorId: 999999999,
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it("cria, lista e busca uma matéria", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);

    const list = await request(app).get("/subjects");
    const found = await request(app).get(`/subjects/${subject.id}`);

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(list.body.data.length);
    expect(list.body.data.some((item) => item.id === subject.id)).toBe(true);
    expect(found.status).toBe(200);
    expect(found.body.data.professor.id).toBe(professor.id);
  });

  it("atualiza somente os campos enviados", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id, { ativa: true });

    const response = await request(app)
      .patch(`/subjects/${subject.id}`)
      .send({ nome: "WEB II atualizada" });

    expect(response.status).toBe(200);
    expect(response.body.data.nome).toBe("WEB II atualizada");
    expect(response.body.data.ativa).toBe(true);
    expect(response.body.data.professor.id).toBe(professor.id);
  });

  it("valida PATCH e o professor informado", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);

    const empty = await request(app).patch(`/subjects/${subject.id}`).send({});
    const invalidId = await request(app)
      .patch("/subjects/abc")
      .send({ nome: "X" });
    const missingProfessor = await request(app)
      .patch(`/subjects/${subject.id}`)
      .send({ professorId: 999999999 });

    expect(empty.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(missingProfessor.status).toBe(404);
  });

  it("remove matéria sem questões", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);

    const removed = await request(app).delete(`/subjects/${subject.id}`);
    const found = await request(app).get(`/subjects/${subject.id}`);

    expect(removed.status).toBe(200);
    expect(removed.body.data.id).toBe(subject.id);
    expect(found.status).toBe(404);
  });

  it("impede remover matéria com questão vinculada", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);
    await createQuestion(subject.id, professor.id);

    const response = await request(app).delete(`/subjects/${subject.id}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("questões vinculadas");
  });
});

describe("Question API", () => {
  it("retorna 404 ao criar questão com autor inexistente", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);

    const response = await request(app).post("/questions").send({
      enunciado: "Questão sem autor",
      dificuldade: 2,
      subjectId: subject.id,
      authorId: 999999999,
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it("cria, lista e busca uma questão", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id);

    const list = await request(app).get("/questions");
    const found = await request(app).get(`/questions/${question.id}`);

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(list.body.data.length);
    expect(list.body.data.some((item) => item.id === question.id)).toBe(true);
    expect(found.status).toBe(200);
    expect(found.body.data.subject.id).toBe(subject.id);
    expect(found.body.data.author.id).toBe(author.id);
  });

  it("atualiza parcialmente uma questão", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id, {
      dificuldade: 1,
      ativa: true,
    });

    const response = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ dificuldade: 3, respostaCorreta: null });

    expect(response.status).toBe(200);
    expect(response.body.data.dificuldade).toBe(3);
    expect(response.body.data.respostaCorreta).toBeNull();
    expect(response.body.data.enunciado).toBe(question.enunciado);
    expect(response.body.data.ativa).toBe(true);
  });

  it("valida dificuldade, IDs e relações", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id);

    const invalidDifficulty = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ dificuldade: 4 });
    const invalidId = await request(app)
      .patch("/questions/abc")
      .send({ dificuldade: 2 });
    const missingSubject = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ subjectId: 999999999 });

    expect(invalidDifficulty.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(missingSubject.status).toBe(404);
  });

  it("remove uma questão", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id);

    const removed = await request(app).delete(`/questions/${question.id}`);
    const found = await request(app).get(`/questions/${question.id}`);

    expect(removed.status).toBe(200);
    expect(removed.body.data.id).toBe(question.id);
    expect(found.status).toBe(404);
  });

  it("retorna 404 para questão inexistente", async () => {
    const update = await request(app)
      .patch("/questions/999999999")
      .send({ dificuldade: 2 });
    const remove = await request(app).delete("/questions/999999999");

    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});
