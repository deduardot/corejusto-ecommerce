import { categoriasService } from '../services/categorias.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const categoriasController = {
  listPublic: asyncHandler(async (_req, res) => {
    const data = await categoriasService.listPublic();
    res.json({ ok: true, data });
  }),

  listAdmin: asyncHandler(async (_req, res) => {
    const data = await categoriasService.listAdmin();
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await categoriasService.create(req.body);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await categoriasService.update(Number(req.params.id), req.body);
    res.json({ ok: true, data });
  }),

  remove: asyncHandler(async (req, res) => {
    await categoriasService.remove(Number(req.params.id));
    res.json({ ok: true, mensaje: 'Categoría eliminada correctamente' });
  })
};