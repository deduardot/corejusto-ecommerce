import { direccionesService } from '../services/direcciones.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const direccionesController = {
  listMine: asyncHandler(async (req, res) => {
    const data = await direccionesService.listMine(req.user.id);
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await direccionesService.create(req.user.id, req.body);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await direccionesService.update(Number(req.params.id), req.user.id, req.body);
    res.json({ ok: true, data });
  }),

  remove: asyncHandler(async (req, res) => {
    await direccionesService.remove(Number(req.params.id), req.user.id);
    res.json({ ok: true, mensaje: 'Dirección eliminada correctamente' });
  })
};