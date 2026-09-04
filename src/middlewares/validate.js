import { ValidationError } from "../errors/AppError.js";

/**
 * Cria um middleware que valida e substitui dados HTTP pelos valores parseados.
 * @param {import("zod").ZodType} schema - Schema Zod a aplicar.
 * @param {"body"|"params"|"query"} [source="body"] - Fonte dos dados da requisição.
 * @returns {import("express").RequestHandler} Middleware de validação.
 */
export default function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));

      return next(new ValidationError("Dados de entrada inválidos", details));
    }

    req[source] = result.data;
    return next();
  };
}
