import { rolesService } from '../services/roles.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const rolesController = {
  listPermissions: asyncHandler(async (_req, res) => {
    const data = await rolesService.listPermissions();
    res.json({ ok: true, data });
  }),

  listRoles: asyncHandler(async (_req, res) => {
    const data = await rolesService.listRoles();
    res.json({ ok: true, data });
  }),

  createRole: asyncHandler(async (req, res) => {
    const data = await rolesService.createRole(req.body);
    res.status(201).json({ ok: true, data });
  }),

  updateRole: asyncHandler(async (req, res) => {
    const data = await rolesService.updateRole(Number(req.params.id), req.body);
    res.json({ ok: true, data });
  }),

  deleteRole: asyncHandler(async (req, res) => {
    await rolesService.deleteRole(Number(req.params.id));
    res.json({ ok: true, mensaje: 'Rol eliminado correctamente' });
  })
};