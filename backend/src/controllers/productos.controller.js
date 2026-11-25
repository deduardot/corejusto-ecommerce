import { productosService } from '../services/productos.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const productosController = {
  listPublic: asyncHandler(async (req, res) => {
    const data = await productosService.listPublic(req.query);
    res.json({ ok: true, data });
  }),

  listAdmin: asyncHandler(async (_req, res) => {
    const data = await productosService.listAdmin();
    res.json({ ok: true, data });
  }),

  getPublicBySlug: asyncHandler(async (req, res) => {
    const data = await productosService.getPublicBySlug(req.params.slug);
    res.json({ ok: true, data });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await productosService.getById(Number(req.params.id));
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await productosService.create(req.body, req.file);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await productosService.update(Number(req.params.id), req.body, req.file);
    res.json({ ok: true, data });
  }),

  toggleStatus: asyncHandler(async (req, res) => {
    const data = await productosService.toggleStatus(Number(req.params.id), req.body.activo);
    res.json({ ok: true, data });
  })
};