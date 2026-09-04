# #06 — Resposta esperada: validação e erros para Subject e Question

Esta resposta continua a prática da Aula 06. O `User` já usa Zod, `AppError`, `validate`, `notFoundHandler` e `errorHandler`. Agora aplicaremos o mesmo contrato às matérias e questões, sem alterar o schema Prisma nem criar rotas novas.

# Passo a passo

## 1. Criar os schemas de Subject

Crie `src/schemas/subjectSchema.js`:

```js
import { z } from "zod";

/** Schema reutilizável para IDs de parâmetros. */
export const idParamSchema = z.object({
  id: z.coerce.number().int("ID deve ser inteiro").positive("ID deve ser positivo"),
});

/** Schema para POST /subjects. */
export const createSubjectSchema = z
  .object({
    nome: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
    professorId: z.coerce.number().int("professorId deve ser inteiro").positive("professorId deve ser positivo"),
    ativa: z.boolean().optional(),
  })
  .strict();

/** Schema para PATCH /subjects/:id. */
export const updateSubjectSchema = z
  .object({
    nome: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres").optional(),
    professorId: z.coerce.number().int("professorId deve ser inteiro").positive("professorId deve ser positivo").optional(),
    ativa: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envie pelo menos um campo para atualização",
  });
```

## 2. Criar os schemas de Question

Crie `src/schemas/questionSchema.js`:

```js
import { z } from "zod";

/** Schema reutilizável para IDs de parâmetros. */
export const idParamSchema = z.object({
  id: z.coerce.number().int("ID deve ser inteiro").positive("ID deve ser positivo"),
});

const questionFields = {
  enunciado: z.string().trim().min(3, "Enunciado deve ter pelo menos 3 caracteres").max(500, "Enunciado deve ter no máximo 500 caracteres"),
  dificuldade: z.coerce.number().int("Dificuldade deve ser inteira").min(1, "Dificuldade deve estar entre 1 e 3").max(3, "Dificuldade deve estar entre 1 e 3"),
  respostaCorreta: z.union([z.string().trim().min(1, "Resposta correta não pode ser vazia").max(500, "Resposta correta deve ter no máximo 500 caracteres"), z.null()]),
  subjectId: z.coerce.number().int("subjectId deve ser inteiro").positive("subjectId deve ser positivo"),
  authorId: z.coerce.number().int("authorId deve ser inteiro").positive("authorId deve ser positivo"),
  ativa: z.boolean(),
};

/** Schema para POST /questions. */
export const createQuestionSchema = z
  .object({
    enunciado: questionFields.enunciado,
    dificuldade: questionFields.dificuldade,
    respostaCorreta: questionFields.respostaCorreta.optional(),
    subjectId: questionFields.subjectId,
    authorId: questionFields.authorId,
    ativa: questionFields.ativa.optional(),
  })
  .strict();

/** Schema para PATCH /questions/:id. */
export const updateQuestionSchema = z
  .object({
    enunciado: questionFields.enunciado.optional(),
    dificuldade: questionFields.dificuldade.optional(),
    respostaCorreta: questionFields.respostaCorreta.optional(),
    subjectId: questionFields.subjectId.optional(),
    authorId: questionFields.authorId.optional(),
    ativa: questionFields.ativa.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envie pelo menos um campo para atualização",
  });
```

## 3. Refatorar o service de matérias

Substitua `src/services/subjectService.js`:

```js
import prisma from "../config/database.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";

const publicUserSelect = { id: true, nome: true, email: true, papel: true, foto: true };
const publicSubjectSelect = {
  id: true,
  nome: true,
  ativa: true,
  createdAt: true,
  updatedAt: true,
  professor: { select: publicUserSelect },
};

/** @returns {Promise<object[]>} Matérias públicas ordenadas por criação. */
export function getAllSubjects() {
  return prisma.subject.findMany({ select: publicSubjectSelect, orderBy: { createdAt: "desc" } });
}

/**
 * @param {number} subjectId - ID já validado da matéria.
 * @returns {Promise<object>} Matéria encontrada.
 * @throws {NotFoundError} Quando a matéria não existe.
 */
export async function getSubjectById(subjectId) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: publicSubjectSelect });
  if (!subject) throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  return subject;
}

/**
 * @param {{nome: string, professorId: number, ativa?: boolean}} data - Dados já parseados pelo Zod.
 * @returns {Promise<object>} Matéria criada.
 * @throws {NotFoundError} Quando o professor não existe.
 */
export async function createSubject(data) {
  const professor = await prisma.user.findUnique({ where: { id: data.professorId }, select: { id: true } });
  if (!professor) throw new NotFoundError(`Professor com ID ${data.professorId} não encontrado`);
  return prisma.subject.create({ data: { ...data, ativa: data.ativa ?? true }, select: publicSubjectSelect });
}

/**
 * @param {number} subjectId - ID da matéria.
 * @param {{nome?: string, professorId?: number, ativa?: boolean}} data - Atualização parcial validada.
 * @returns {Promise<object>} Matéria atualizada.
 * @throws {NotFoundError} Quando matéria ou professor não existem.
 */
export async function updateSubject(subjectId, data) {
  await getSubjectById(subjectId);
  if (data.professorId !== undefined) {
    const professor = await prisma.user.findUnique({ where: { id: data.professorId }, select: { id: true } });
    if (!professor) throw new NotFoundError(`Professor com ID ${data.professorId} não encontrado`);
  }
  return prisma.subject.update({ where: { id: subjectId }, data, select: publicSubjectSelect });
}

/**
 * @param {number} subjectId - ID da matéria.
 * @returns {Promise<object>} Matéria removida.
 * @throws {NotFoundError} Quando a matéria não existe.
 * @throws {ConflictError} Quando há questões vinculadas.
 */
export async function deleteSubject(subjectId) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, _count: { select: { questions: true } } } });
  if (!subject) throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  if (subject._count.questions > 0) throw new ConflictError("Matéria possui questões vinculadas");
  return prisma.subject.delete({ where: { id: subjectId }, select: publicSubjectSelect });
}
```

## 4. Refatorar o service de questões

Substitua `src/services/questionService.js`:

```js
import prisma from "../config/database.js";
import { NotFoundError } from "../errors/AppError.js";

const publicUserSelect = { id: true, nome: true, email: true, papel: true, foto: true };
const publicSubjectSelect = { id: true, nome: true, ativa: true };
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

/** Valida as relações recebidas por uma questão. */
async function assertRelations(data) {
  if (data.subjectId !== undefined) {
    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId }, select: { id: true } });
    if (!subject) throw new NotFoundError(`Matéria com ID ${data.subjectId} não encontrada`);
  }
  if (data.authorId !== undefined) {
    const author = await prisma.user.findUnique({ where: { id: data.authorId }, select: { id: true } });
    if (!author) throw new NotFoundError(`Autor com ID ${data.authorId} não encontrado`);
  }
}

/** @returns {Promise<object[]>} Questões públicas ordenadas por criação. */
export function getAllQuestions() {
  return prisma.question.findMany({ select: publicQuestionSelect, orderBy: { createdAt: "desc" } });
}

/**
 * @param {number} questionId - ID da questão.
 * @returns {Promise<object>} Questão encontrada.
 * @throws {NotFoundError} Quando a questão não existe.
 */
export async function getQuestionById(questionId) {
  const question = await prisma.question.findUnique({ where: { id: questionId }, select: publicQuestionSelect });
  if (!question) throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  return question;
}

/**
 * @param {object} data - Dados de criação já validados.
 * @returns {Promise<object>} Questão criada.
 */
export async function createQuestion(data) {
  await assertRelations(data);
  return prisma.question.create({ data: { ...data, ativa: data.ativa ?? true }, select: publicQuestionSelect });
}

/**
 * @param {number} questionId - ID da questão.
 * @param {object} data - Dados parciais já validados.
 * @returns {Promise<object>} Questão atualizada.
 */
export async function updateQuestion(questionId, data) {
  await getQuestionById(questionId);
  await assertRelations(data);
  return prisma.question.update({ where: { id: questionId }, data, select: publicQuestionSelect });
}

/**
 * @param {number} questionId - ID da questão.
 * @returns {Promise<object>} Questão removida.
 */
export async function deleteQuestion(questionId) {
  await getQuestionById(questionId);
  return prisma.question.delete({ where: { id: questionId }, select: publicQuestionSelect });
}
```

## 5. Simplificar os controllers

Substitua `src/controllers/subjectController.js` por handlers que apenas chamam o service. O mesmo padrão vale para `questionController.js`:

```js
import * as subjectService from "../services/subjectService.js";

/** @param {import("express").Request} _req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function getAll(_req, res, next) {
  try { const data = await subjectService.getAllSubjects(); res.status(200).json({ success: true, data, total: data.length }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function getById(req, res, next) {
  try { const data = await subjectService.getSubjectById(req.params.id); res.status(200).json({ success: true, data }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function create(req, res, next) {
  try { const data = await subjectService.createSubject(req.body); res.status(201).json({ success: true, message: "Matéria criada com sucesso", data }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function update(req, res, next) {
  try { const data = await subjectService.updateSubject(req.params.id, req.body); res.status(200).json({ success: true, message: "Matéria atualizada com sucesso", data }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function remove(req, res, next) {
  try { const data = await subjectService.deleteSubject(req.params.id); res.status(200).json({ success: true, message: "Matéria removida com sucesso", data }); } catch (error) { next(error); }
}
```

Substitua `src/controllers/questionController.js`:

```js
import * as questionService from "../services/questionService.js";

/** @param {import("express").Request} _req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function getAll(_req, res, next) {
  try { const data = await questionService.getAllQuestions(); res.status(200).json({ success: true, data, total: data.length }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function getById(req, res, next) {
  try { const data = await questionService.getQuestionById(req.params.id); res.status(200).json({ success: true, data }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function create(req, res, next) {
  try { const data = await questionService.createQuestion(req.body); res.status(201).json({ success: true, message: "Questão criada com sucesso", data }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function update(req, res, next) {
  try { const data = await questionService.updateQuestion(req.params.id, req.body); res.status(200).json({ success: true, message: "Questão atualizada com sucesso", data }); } catch (error) { next(error); }
}

/** @param {import("express").Request} req @param {import("express").Response} res @param {import("express").NextFunction} next */
export async function remove(req, res, next) {
  try { const data = await questionService.deleteQuestion(req.params.id); res.status(200).json({ success: true, message: "Questão removida com sucesso", data }); } catch (error) { next(error); }
}
```

## 6. Aplicar os schemas nas rotas

Substitua `src/routes/subjectRoutes.js`:

```js
import express from "express";
import * as subjectController from "../controllers/subjectController.js";
import validate from "../middlewares/validate.js";
import { createSubjectSchema, idParamSchema, updateSubjectSchema } from "../schemas/subjectSchema.js";

const router = express.Router();
router.post("/", validate(createSubjectSchema), subjectController.create);
router.get("/", subjectController.getAll);
router.get("/:id", validate(idParamSchema, "params"), subjectController.getById);
router.patch("/:id", validate(idParamSchema, "params"), validate(updateSubjectSchema), subjectController.update);
router.delete("/:id", validate(idParamSchema, "params"), subjectController.remove);
export default router;
```

Substitua `src/routes/questionRoutes.js`:

```js
import express from "express";
import * as questionController from "../controllers/questionController.js";
import validate from "../middlewares/validate.js";
import { createQuestionSchema, idParamSchema, updateQuestionSchema } from "../schemas/questionSchema.js";

const router = express.Router();
router.post("/", validate(createQuestionSchema), questionController.create);
router.get("/", questionController.getAll);
router.get("/:id", validate(idParamSchema, "params"), questionController.getById);
router.patch("/:id", validate(idParamSchema, "params"), validate(updateQuestionSchema), questionController.update);
router.delete("/:id", validate(idParamSchema, "params"), questionController.remove);
export default router;
```

## 7. Ampliar os testes de integração

Substitua `tests/subjects-and-questions.test.js`. Ele importa `app`, usa IDs retornados e limpa em ordem.

```js
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const userIds = [];
const subjectIds = [];
const questionIds = [];

/** Gera e-mail único para cada fixture de teste. */
function email(label) {
  return `aula06-${label}-${Date.now()}-${Math.random()}@exemplo.com`;
}

/** Cria um usuário válido e registra seu ID para limpeza. */
async function createUser() {
  const response = await request(app).post("/users").send({ nome: "Professor de teste", email: email("professor") });
  expect(response.status).toBe(201);
  userIds.push(response.body.data.id);
  return response.body.data;
}

/** Cria uma matéria válida e registra seu ID para limpeza. */
async function createSubject(professorId) {
  const response = await request(app).post("/subjects").send({ nome: "Programação Web", professorId });
  expect(response.status).toBe(201);
  subjectIds.push(response.body.data.id);
  return response.body.data;
}

/** Cria uma questão válida e registra seu ID para limpeza. */
async function createQuestion(subjectId, authorId) {
  const response = await request(app).post("/questions").send({ enunciado: "O que é uma API?", dificuldade: 2, subjectId, authorId });
  expect(response.status).toBe(201);
  questionIds.push(response.body.data.id);
  return response.body.data;
}

/** Confere o formato comum de uma resposta de erro. */
function expectApiError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe(code);
  expect(response.body.timestamp).toBeDefined();
  expect(response.body.path).toBeDefined();
}

afterEach(async () => {
  await prisma.question.deleteMany({ where: { id: { in: questionIds.splice(0) } } });
  await prisma.subject.deleteMany({ where: { id: { in: subjectIds.splice(0) } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});

describe("Subject API com validação", () => {
  it("rejeita corpo inválido, campo extra e parâmetro inválido", async () => {
    const response = await request(app).post("/subjects").send({ nome: " ", professorId: "invalido", inesperado: true });
    expectApiError(response, 400, "VALIDATION_ERROR");
    const invalidId = await request(app).get("/subjects/abc");
    expectApiError(invalidId, 400, "VALIDATION_ERROR");
  });

  it("transforma nome, preserva campos e padroniza professor inexistente", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);
    const response = await request(app).patch(`/subjects/${subject.id}`).send({ nome: "  Banco de Dados  " });
    expect(response.status).toBe(200);
    expect(response.body.data.nome).toBe("Banco de Dados");
    expect(response.body.data.professor.id).toBe(professor.id);
    const missingProfessor = await createUser();
    await prisma.user.delete({ where: { id: missingProfessor.id } });
    const missing = await request(app).patch(`/subjects/${subject.id}`).send({ professorId: missingProfessor.id });
    expectApiError(missing, 404, "NOT_FOUND");
  });

  it("impede remover matéria com questão e confirma remoção posterior", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.id);
    await createQuestion(subject.id, professor.id);
    const conflict = await request(app).delete(`/subjects/${subject.id}`);
    expectApiError(conflict, 409, "CONFLICT");
    await prisma.question.deleteMany({ where: { subjectId: subject.id } });
    const removed = await request(app).delete(`/subjects/${subject.id}`);
    expect(removed.status).toBe(200);
    const found = await request(app).get(`/subjects/${subject.id}`);
    expectApiError(found, 404, "NOT_FOUND");
  });
});

describe("Question API com validação", () => {
  it("rejeita dificuldade inválida, campo extra e autor inexistente", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const invalid = await request(app).post("/questions").send({ enunciado: "Questão válida", dificuldade: 4, subjectId: subject.id, authorId: author.id, extra: true });
    expectApiError(invalid, 400, "VALIDATION_ERROR");
    const missingAuthor = await createUser();
    await prisma.user.delete({ where: { id: missingAuthor.id } });
    const missing = await request(app).post("/questions").send({ enunciado: "Questão válida", dificuldade: 1, subjectId: subject.id, authorId: missingAuthor.id });
    expectApiError(missing, 404, "NOT_FOUND");
  });

  it("transforma enunciado, aceita resposta nula e confirma exclusão", async () => {
    const author = await createUser();
    const subject = await createSubject(author.id);
    const question = await createQuestion(subject.id, author.id);
    const updated = await request(app).patch(`/questions/${question.id}`).send({ enunciado: "  O que é REST?  ", respostaCorreta: null });
    expect(updated.status).toBe(200);
    expect(updated.body.data.enunciado).toBe("O que é REST?");
    expect(updated.body.data.respostaCorreta).toBeNull();
    const removed = await request(app).delete(`/questions/${question.id}`);
    expect(removed.status).toBe(200);
    const found = await request(app).get(`/questions/${question.id}`);
    expectApiError(found, 404, "NOT_FOUND");
  });
});

describe("Contrato global de erro", () => {
  it("padroniza a rota inexistente", async () => {
    const response = await request(app).get("/rota-inexistente");
    expectApiError(response, 404, "NOT_FOUND");
  });
});
```

Também teste `PATCH` vazio, parâmetros como `/questions/abc`, campos extras, `respostaCorreta: null`, matéria inexistente, exclusão com vínculo e rota desconhecida. Não importe `server.js` e não crie uma porta de rede dentro da suíte.

## 8. Conferir no Bruno

| Requisição | Resultado esperado |
| --- | --- |
| `POST /subjects` com `nome` vazio | `400 VALIDATION_ERROR` |
| `PATCH /subjects/:id` com campo extra | `400 VALIDATION_ERROR` |
| `DELETE /subjects/:id` com questão | `409 CONFLICT` |
| `POST /questions` com dificuldade `4` | `400 VALIDATION_ERROR` |
| `PATCH /questions/:id` com autor inexistente | `404 NOT_FOUND` |
| `GET /rota-inexistente` | `404 NOT_FOUND` |

Todas devem trazer `success: false`, `error`, `timestamp` e `path`. A collection deve criar dados temporários com `bru.setVar`, removê-los depois e continuar até o fim quando uma asserção falhar.

## 9. Checklist final

- [ ] schemas de User, Subject e Question rejeitam campos não permitidos;
- [ ] parâmetros e corpos são parseados antes do controller;
- [ ] services representam regras de negócio com erros customizados;
- [ ] handlers 404 e 500 usam o mesmo contrato;
- [ ] nenhum erro 500 expõe detalhes internos;
- [ ] `app.js` configura a aplicação e `server.js` somente a inicia;
- [ ] testes usam `app.js`, dados únicos e limpeza por dependência;
- [ ] Bruno e testes de integração cobrem os cenários de validação;
- [ ] `npm test`, cobertura, formatação e lint passam no ambiente de testes isolado.

# 📚 Referências

- [Zod — APIs de schemas](https://zod.dev/api)
- [Zod — tratamento de erros](https://zod.dev/error-customization)
- [Express 5 — tratamento de erros](https://expressjs.com/en/5x/guide/error-handling/)
- [OWASP — Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP — Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html)
- [Prisma — erros conhecidos](https://www.prisma.io/docs/orm/reference/error-reference)
- [Vitest — guia](https://vitest.dev/guide/)
