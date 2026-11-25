import { pedidosService } from '../services/pedidos.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const pedidosController = {
  create: asyncHandler(async (req, res) => {
    const data = await pedidosService.crearPedido(req.user.id, req.body);
    res.status(201).json({ ok: true, data });
  }),

  listMine: asyncHandler(async (req, res) => {
    const data = await pedidosService.listMine(req.user.id);
    res.json({ ok: true, data });
  }),

  listAdmin: asyncHandler(async (req, res) => {
    const data = await pedidosService.listAdmin(req.query);
    res.json({ ok: true, data });
  }),

  getDetail: asyncHandler(async (req, res) => {
    const data = await pedidosService.getDetail(Number(req.params.id), req.user);
    res.json({ ok: true, data });
  }),

  subirComprobante: asyncHandler(async (req, res) => {
    const data = await pedidosService.subirComprobanteQr(Number(req.params.id), req.user.id, req.file);
    res.json({ ok: true, data });
  }),

  simularQr: asyncHandler(async (req, res) => {
    const data = await pedidosService.simularConfirmacionQr(Number(req.params.id), req.user.id);
    res.json({ ok: true, data });
  }),

  validarPago: asyncHandler(async (req, res) => {
    const data = await pedidosService.validarPagoAdmin(Number(req.params.id), req.user.id, req.body);
    res.json({ ok: true, data });
  }),

  updateEstado: asyncHandler(async (req, res) => {
    const data = await pedidosService.actualizarEstado(Number(req.params.id), req.body.estado);
    res.json({ ok: true, data });
  }),

  cancelar: asyncHandler(async (req, res) => {
    const data = await pedidosService.cancelarPedido(Number(req.params.id), req.user, req.body);
    res.json({ ok: true, data });
  }),

  resumenFinanciero: asyncHandler(async (_req, res) => {
    const data = await pedidosService.obtenerResumenFinanciero();
    res.json({ ok: true, data });
  })
};