import * as subjectService from "../services/subjectService.js";

const allowedPatchFields = ["nome", "ativa", "professorId"];

function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function hasAllowedPatchField(body) {
  return allowedPatchFields.some((field) => Object.hasOwn(body, field));
}

function hasInvalidSubjectFields({ nome, ativa }) {
  return (
    (nome !== undefined && (typeof nome !== "string" || !nome.trim())) ||
    (ativa !== undefined && typeof ativa !== "boolean")
  );
}

export const create = async (req, res) => {
  try {
    const { nome, professorId, ativa } = req.body;
    const professorIdNumber = toPositiveInt(professorId);

    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      !professorIdNumber ||
      hasInvalidSubjectFields({ nome, ativa })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nome e professorId válido são obrigatórios; ativa deve ser booleana",
      });
    }

    const result = await subjectService.createSubject({
      nome,
      professorId: professorIdNumber,
      ativa,
    });

    if (!result.ok && result.reason === "PROFESSOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Professor com ID ${professorIdNumber} não encontrado`,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Matéria criada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao criar matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar matéria",
    });
  }
};

export const getAll = async (_req, res) => {
  try {
    const subjects = await subjectService.getAllSubjects();

    return res.status(200).json({
      success: true,
      data: subjects,
      total: subjects.length,
    });
  } catch (error) {
    console.error("Erro ao listar matérias:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar matérias",
    });
  }
};

export const getById = async (req, res) => {
  try {
    const subjectId = toPositiveInt(req.params.id);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const subject = await subjectService.getSubjectById(subjectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("Erro ao buscar matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar matéria",
    });
  }
};

export const update = async (req, res) => {
  try {
    const subjectId = toPositiveInt(req.params.id);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    if (!hasAllowedPatchField(req.body) || hasInvalidSubjectFields(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Envie ao menos um campo válido: nome, ativa ou professorId",
      });
    }

    const data = { ...req.body };

    if (Object.hasOwn(data, "professorId")) {
      data.professorId = toPositiveInt(data.professorId);

      if (!data.professorId) {
        return res.status(400).json({
          success: false,
          message: "professorId deve ser um número inteiro positivo",
        });
      }
    }

    const result = await subjectService.updateSubject(subjectId, data);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    if (!result.ok && result.reason === "PROFESSOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Professor com ID ${data.professorId} não encontrado`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Matéria atualizada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao atualizar matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar matéria",
    });
  }
};

export const remove = async (req, res) => {
  try {
    const subjectId = toPositiveInt(req.params.id);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const result = await subjectService.deleteSubject(subjectId);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    if (!result.ok && result.reason === "SUBJECT_IN_USE") {
      return res.status(409).json({
        success: false,
        message: "Matéria possui questões vinculadas",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Matéria removida com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao remover matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao remover matéria",
    });
  }
};
