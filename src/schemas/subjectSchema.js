import { z } from "zod";
import { positiveIdSchema } from "./idSchema.js";

const professorIdSchema = positiveIdSchema;

const ativaSchema = z.boolean();

/** Schema para POST /subjects. */
export const createSubjectSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Nome deve ter pelo menos 3 caracteres")
      .max(100, "Nome deve ter no máximo 100 caracteres"),

    professorId: professorIdSchema,

    ativa: ativaSchema.optional(),
  })
  .strict();

/** Schema para PATCH /subjects/:id. */
export const updateSubjectSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Nome deve ter pelo menos 3 caracteres")
      .max(100, "Nome deve ter no máximo 100 caracteres")
      .optional(),

    professorId: professorIdSchema.optional(),

    ativa: ativaSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envie pelo menos um campo para atualização",
  });

/** Schema para parâmetros :id de Subject. */
export const subjectIdParamSchema = z.object({
  id: positiveIdSchema,
});
