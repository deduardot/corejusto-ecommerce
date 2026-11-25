import { configService } from '../services/config.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const configController = {
  getPublic: asyncHandler(async (_req, res) => {
    const data = await configService.getPublicConfig();
    res.json({ ok: true, data });
  }),

  updateStore: asyncHandler(async (req, res) => {
    const data = await configService.updateStoreConfig(req.body, req.file);
    res.json({ ok: true, data });
  }),

  listZones: asyncHandler(async (_req, res) => {
    const data = await configService.listAllZones();
    res.json({ ok: true, data });
  }),

  createZone: asyncHandler(async (req, res) => {
    const data = await configService.createZone(req.body);
    res.status(201).json({ ok: true, data });
  }),

  updateZone: asyncHandler(async (req, res) => {
    const data = await configService.updateZone(Number(req.params.id), req.body);
    res.json({ ok: true, data });
  }),

  deleteZone: asyncHandler(async (req, res) => {
    await configService.deleteZone(Number(req.params.id));
    res.json({ ok: true, mensaje: 'Zona de envío eliminada correctamente' });
  })
};