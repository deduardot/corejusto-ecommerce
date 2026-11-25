import { inventarioService } from '../services/inventario.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const inventarioController = {
  listLotes: asyncHandler(async (req, res) => {
    const data = await inventarioService.listarLotes(req.query);
    res.json({ ok: true, data });
  }),

  ingresarLote: asyncHandler(async (req, res) => {
    const data = await inventarioService.ingresarLote(req.body, req.user.id);
    res.status(201).json({ ok: true, data });
  }),

  registrarMerma: asyncHandler(async (req, res) => {
    const data = await inventarioService.registrarAjusteMerma(req.body, req.user.id);
    res.json({ ok: true, data });
  }),

  anularLote: asyncHandler(async (req, res) => {
    const data = await inventarioService.anularLote(Number(req.params.id), req.body, req.user.id);
    res.json({ ok: true, data });
  }),

  listKardex: asyncHandler(async (req, res) => {
    const data = await inventarioService.listarKardex(req.query);
    res.json({ ok: true, data });
  }),

  listAlertas: asyncHandler(async (_req, res) => {
    const data = await inventarioService.listarAlertasStockBajo();
    res.json({ ok: true, data });
  }),

  getValorizacion: asyncHandler(async (_req, res) => {
    const data = await inventarioService.obtenerValorizacion();
    res.json({ ok: true, data });
  }),

  simularFifo: asyncHandler(async (req, res) => {
    const data = await inventarioService.simularConsumoFifo(req.body);
    res.json({ ok: true, data });
  })
};