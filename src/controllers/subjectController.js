import * as subjectService from "../services/subjectService.js";

/**
 * Cria uma matéria.
 */
export const create = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubject(req.body);

    return res.status(201).json({
      success: true,
      message: "Matéria criada com sucesso",
      data: subject.data,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lista todas as matérias.
 */
export const getAll = async (_req, res, next) => {
  try {
    const subjects = await subjectService.getAllSubjects();

    return res.status(200).json({
      success: true,
      data: subjects,
      total: subjects.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Busca uma matéria pelo ID.
 */
export const getById = async (req, res, next) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Atualiza parcialmente uma matéria.
 */
export const update = async (req, res, next) => {
  try {
    const result = await subjectService.updateSubject(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Matéria atualizada com sucesso",
      data: result.data,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Remove uma matéria.
 */
export const remove = async (req, res, next) => {
  try {
    const result = await subjectService.deleteSubject(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Matéria removida com sucesso",
      data: result.data,
    });
  } catch (error) {
    return next(error);
  }
};
