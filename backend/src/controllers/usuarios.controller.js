import { usuariosService } from '../services/usuarios.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const usuariosController = {
  list: asyncHandler(async (_req, res) => {
    const data = await usuariosService.listUsers();
    res.json({ ok: true, data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await usuariosService.getUserById(Number(req.params.id));
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await usuariosService.createUser(req.body);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await usuariosService.updateUser(Number(req.params.id), req.body, req.user.id);
    res.json({ ok: true, data });
  }),

  toggleStatus: asyncHandler(async (req, res) => {
    const data = await usuariosService.toggleUserStatus(
      Number(req.params.id),
      req.body.activo,
      req.user.id
    );
    res.json({ ok: true, data });
  })
};