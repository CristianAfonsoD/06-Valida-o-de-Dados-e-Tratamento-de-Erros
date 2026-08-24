import prisma from "../config/database.js";

const publicUserSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  foto: true,
  createdAt: true,
};

function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

// CREATE - Criar novo usuário
export const create = async (req, res) => {
  try {
    const { nome, email, papel, foto } = req.body;

    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Nome e email são obrigatórios",
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const emailExistente = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (emailExistente) {
      return res.status(409).json({
        success: false,
        message: "Email já cadastrado no sistema",
      });
    }

    const novoUsuario = await prisma.user.create({
      data: {
        nome: nome.trim(),
        email: emailNormalizado,
        papel: papel || "PROFESSOR",
        foto: foto || null,
      },
      select: publicUserSelect,
    });

    return res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: novoUsuario,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email já cadastrado no sistema",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erro ao criar usuário",
    });
  }
};

// READ - Listar todos os usuários
export const getAll = async (_req, res) => {
  try {
    const usuarios = await prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: usuarios,
      total: usuarios.length,
    });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar usuários",
    });
  }
};

// READ - Buscar usuário por ID
export const getById = async (req, res) => {
  try {
    const userId = toPositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: `Usuário com ID ${userId} não encontrado`,
      });
    }

    return res.status(200).json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar usuário",
    });
  }
};
