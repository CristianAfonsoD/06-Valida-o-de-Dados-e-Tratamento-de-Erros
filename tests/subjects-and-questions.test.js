import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const userIds = [];
const subjectIds = [];
const questionIds = [];

/**
 * Gera e-mail único para cada fixture de teste.
 * @param {string} label - Identificador do cenário que cria o e-mail.
 * @returns {string} E-mail único para um usuário temporário.
 */
function email(label) {
  return `aula06-${label}-${Date.now()}-${Math.random()}@exemplo.com`;
}

/**
 * Cria um usuário válido e registra seu ID para limpeza.
 * @param {object} [overrides={}] - Campos que substituem os dados padrão.
 * @returns {Promise<object>} Usuário criado pela API.
 */
async function createUser(overrides = {}) {
  const response = await request(app)
    .post("/users")
    .send({
      nome: "Professor de teste",
      email: email("professor"),
      ...overrides,
    });

  expect(response.status).toBe(201);
  userIds.push(response.body.data.id);
  return response.body.data;
}

/**
 * Cria uma matéria válida e registra seu ID para limpeza.
 * @param {number} professorId - Professor responsável pela matéria.
 * @param {object} [overrides={}] - Campos que substituem os dados padrão.
 * @returns {Promise<object>} Matéria criada pela API.
 */
async function createSubject(professorId, overrides = {}) {
  const response = await request(app)
    .post("/subjects")
    .send({ nome: "Programação Web", professorId, ...overrides });

  expect(response.status).toBe(201);
  subjectIds.push(response.body.data.id);
  return response.body.data;
}

/**
 * Cria uma questão válida e registra seu ID para limpeza.
 * @param {number} subjectId - Matéria associada à questão.
 * @param {number} authorId - Autor da questão.
 * @param {object} [overrides={}] - Campos que substituem os dados padrão.
 * @returns {Promise<object>} Questão criada pela API.
 */
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
  questionIds.push(response.body.data.id);
  return response.body.data;
}

/**
 * Confere o formato comum de uma resposta de erro.
 * @param {import("supertest").Response} response - Resposta HTTP recebida.
 * @param {number} status - Status HTTP esperado.
 * @param {string} code - Código de erro esperado.
 * @returns {void}
 */
function expectApiError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe(code);
  expect(response.body.timestamp).toEqual(expect.any(String));
  expect(response.body.path).toEqual(expect.any(String));
}

/** Remove fixtures na ordem questão → matéria → usuário. */
afterEach(async () => {
  await prisma.question.deleteMany({
    where: { id: { in: questionIds.splice(0) } },
  });
  await prisma.subject.deleteMany({
    where: { id: { in: subjectIds.splice(0) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});

describe("Subject API com validação", () => {
  it("rejeita corpo inválido, campo extra e parâmetro inválido", async () => {
    const invalidBody = await request(app).post("/subjects").send({
      nome: " ",
      professorId: "invalido",
      inesperado: true,
    });
    const invalidId = await request(app).get("/subjects/abc");

    expectApiError(invalidBody, 400, "VALIDATION_ERROR");
    expect(invalidBody.body.error.details.length).toBeGreaterThan(1);
    expectApiError(invalidId, 400, "VALIDATION_ERROR");
  });

  it("retorna erro padronizado quando o professor não existe", async () => {
    const response = await request(app).post("/subjects").send({
      nome: "Matéria sem professor",
      professorId: 999999999,
    });

    expectApiError(response, 404, "NOT_FOUND");
  });

  it("cria, lista e busca uma matéria com professor", async () => {
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

  it("transforma nome, preserva campos e valida professor na atualização", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id, { ativa: true });

    const updated = await request(app)
      .patch(`/subjects/${subject.id}`)
      .send({ nome: "  Banco de Dados  " });
    const missingProfessor = await request(app)
      .patch(`/subjects/${subject.id}`)
      .send({ professorId: 999999999 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.nome).toBe("Banco de Dados");
    expect(updated.body.data.ativa).toBe(true);
    expect(updated.body.data.professor.id).toBe(professor.id);
    expectApiError(missingProfessor, 404, "NOT_FOUND");
  });

  it("rejeita PATCH vazio e campos não permitidos", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);

    const empty = await request(app).patch(`/subjects/${subject.id}`).send({});
    const extra = await request(app)
      .patch(`/subjects/${subject.id}`)
      .send({ inesperado: true });

    expectApiError(empty, 400, "VALIDATION_ERROR");
    expectApiError(extra, 400, "VALIDATION_ERROR");
  });

  it("remove matéria sem questões e padroniza a ausência posterior", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);

    const removed = await request(app).delete(`/subjects/${subject.id}`);
    const found = await request(app).get(`/subjects/${subject.id}`);

    expect(removed.status).toBe(200);
    expect(removed.body.data.id).toBe(subject.id);
    expectApiError(found, 404, "NOT_FOUND");
  });

  it("impede remover matéria com questão vinculada", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);
    await createQuestion(subject.id, professor.id);

    const response = await request(app).delete(`/subjects/${subject.id}`);

    expectApiError(response, 409, "CONFLICT");
  });
});

describe("Question API com validação", () => {
  it("rejeita corpo inválido, campo extra e autor inexistente", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);

    const invalid = await request(app).post("/questions").send({
      enunciado: "Questão válida",
      dificuldade: 4,
      subjectId: subject.id,
      authorId: author.id,
      inesperado: true,
    });
    const missingAuthor = await request(app).post("/questions").send({
      enunciado: "Questão válida",
      dificuldade: 1,
      subjectId: subject.id,
      authorId: 999999999,
    });

    expectApiError(invalid, 400, "VALIDATION_ERROR");
    expectApiError(missingAuthor, 404, "NOT_FOUND");
  });

  it("cria, lista e busca uma questão com matéria e autor", async () => {
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

  it("transforma enunciado e aceita resposta nula em atualização parcial", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id, {
      dificuldade: 1,
      ativa: true,
    });

    const response = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ enunciado: "  O que é REST?  ", respostaCorreta: null });

    expect(response.status).toBe(200);
    expect(response.body.data.enunciado).toBe("O que é REST?");
    expect(response.body.data.respostaCorreta).toBeNull();
    expect(response.body.data.dificuldade).toBe(1);
    expect(response.body.data.ativa).toBe(true);
  });

  it("valida dificuldade, IDs, PATCH vazio, campos extras e relações", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id);

    const invalidDifficulty = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ dificuldade: 4 });
    const invalidId = await request(app)
      .patch("/questions/abc")
      .send({ dificuldade: 2 });
    const empty = await request(app)
      .patch(`/questions/${question.id}`)
      .send({});
    const extra = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ inesperado: true });
    const missingSubject = await request(app)
      .patch(`/questions/${question.id}`)
      .send({ subjectId: 999999999 });

    expectApiError(invalidDifficulty, 400, "VALIDATION_ERROR");
    expectApiError(invalidId, 400, "VALIDATION_ERROR");
    expectApiError(empty, 400, "VALIDATION_ERROR");
    expectApiError(extra, 400, "VALIDATION_ERROR");
    expectApiError(missingSubject, 404, "NOT_FOUND");
  });

  it("remove uma questão e padroniza a ausência posterior", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id);

    const removed = await request(app).delete(`/questions/${question.id}`);
    const found = await request(app).get(`/questions/${question.id}`);

    expect(removed.status).toBe(200);
    expect(removed.body.data.id).toBe(question.id);
    expectApiError(found, 404, "NOT_FOUND");
  });

  it("retorna erro padronizado para questão inexistente", async () => {
    const update = await request(app)
      .patch("/questions/999999999")
      .send({ dificuldade: 2 });
    const remove = await request(app).delete("/questions/999999999");

    expectApiError(update, 404, "NOT_FOUND");
    expectApiError(remove, 404, "NOT_FOUND");
  });
});

describe("Contrato global de erro", () => {
  it("padroniza a rota inexistente", async () => {
    const response = await request(app).get("/rota-inexistente");

    expectApiError(response, 404, "NOT_FOUND");
  });
});
