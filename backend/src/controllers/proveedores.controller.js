import { proveedoresService } from '../services/proveedores.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const proveedoresController = {
  listPublic: asyncHandler(async (_req, res) => {
    const data = await proveedoresService.listPublic();
    res.json({ ok: true, data });
  }),

  listAdmin: asyncHandler(async (_req, res) => {
    const data = await proveedoresService.listAdmin();
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await proveedoresService.create(req.body);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await proveedoresService.update(Number(req.params.id), req.body);
    res.json({ ok: true, data });
  }),

  remove: asyncHandler(async (req, res) => {
    await proveedoresService.remove(Number(req.params.id));
    res.json({ ok: true, mensaje: 'Proveedor eliminado correctamente' });
  })
};