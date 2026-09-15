import * as questionService from "../services/questionService.js";

const allowedPatchFields = [
  "enunciado",
  "dificuldade",
  "respostaCorreta",
  "subjectId",
  "authorId",
  "ativa",
];

function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function toDifficulty(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 3 ? number : null;
}

function hasAllowedPatchField(body) {
  return allowedPatchFields.some((field) => Object.hasOwn(body, field));
}

function hasInvalidQuestionFields({ enunciado, respostaCorreta, ativa }) {
  return (
    (enunciado !== undefined &&
      (typeof enunciado !== "string" || !enunciado.trim())) ||
    (respostaCorreta !== undefined &&
      respostaCorreta !== null &&
      typeof respostaCorreta !== "string") ||
    (ativa !== undefined && typeof ativa !== "boolean")
  );
}

function relationErrorResponse(res, result, data) {
  if (result.reason === "SUBJECT_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: `Matéria com ID ${data.subjectId} não encontrada`,
    });
  }

  if (result.reason === "AUTHOR_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: `Autor com ID ${data.authorId} não encontrado`,
    });
  }

  return null;
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
    const difficultyNumber = toDifficulty(dificuldade);
    const subjectIdNumber = toPositiveInt(subjectId);
    const authorIdNumber = toPositiveInt(authorId);

    if (
      typeof enunciado !== "string" ||
      !enunciado.trim() ||
      !difficultyNumber ||
      !subjectIdNumber ||
      !authorIdNumber ||
      hasInvalidQuestionFields({ enunciado, respostaCorreta, ativa })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enunciado, dificuldade entre 1 e 3, subjectId e authorId válidos são obrigatórios",
      });
    }

    const data = {
      enunciado,
      dificuldade: difficultyNumber,
      respostaCorreta,
      subjectId: subjectIdNumber,
      authorId: authorIdNumber,
      ativa,
    };
    const result = await questionService.createQuestion(data);

    if (!result.ok) {
      return relationErrorResponse(res, result, data);
    }

    return res.status(201).json({
      success: true,
      message: "Questão criada com sucesso",
      data: result.data,
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
    const questions = await questionService.getAllQuestions();

    return res.status(200).json({
      success: true,
      data: questions,
      total: questions.length,
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

    const question = await questionService.getQuestionById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("Erro ao buscar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar questão",
    });
  }
};

export const update = async (req, res) => {
  try {
    const questionId = toPositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    if (!hasAllowedPatchField(req.body) || hasInvalidQuestionFields(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Envie ao menos um campo válido da questão",
      });
    }

    const data = { ...req.body };

    if (Object.hasOwn(data, "dificuldade")) {
      data.dificuldade = toDifficulty(data.dificuldade);

      if (!data.dificuldade) {
        return res.status(400).json({
          success: false,
          message: "Dificuldade deve ser um inteiro entre 1 e 3",
        });
      }
    }

    for (const field of ["subjectId", "authorId"]) {
      if (Object.hasOwn(data, field)) {
        data[field] = toPositiveInt(data[field]);

        if (!data[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} deve ser um número inteiro positivo`,
          });
        }
      }
    }

    const result = await questionService.updateQuestion(questionId, data);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    if (!result.ok) {
      return relationErrorResponse(res, result, data);
    }

    return res.status(200).json({
      success: true,
      message: "Questão atualizada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao atualizar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar questão",
    });
  }
};

export const remove = async (req, res) => {
  try {
    const questionId = toPositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const result = await questionService.deleteQuestion(questionId);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Questão removida com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao remover questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao remover questão",
    });
  }
};
