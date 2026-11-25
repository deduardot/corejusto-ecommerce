import { Router } from 'express';
import { pedidosController } from '../controllers/pedidos.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/mios', pedidosController.listMine);
router.get('/resumen/financiero', requirePermission('reportes:ver'), pedidosController.resumenFinanciero);
router.get('/', requirePermission('pedidos:ver_todos'), pedidosController.listAdmin);
router.post('/', pedidosController.create);

router.get('/:id', pedidosController.getDetail);
router.post('/:id/pago/simular-qr', pedidosController.simularQr);
router.post('/:id/pago/comprobante', uploadSingleImage('comprobante'), pedidosController.subirComprobante);
router.patch('/:id/validar-pago', requirePermission('pedidos:actualizar_estado'), pedidosController.validarPago);
router.patch('/:id/estado', requirePermission('pedidos:actualizar_estado'), pedidosController.updateEstado);
router.patch('/:id/cancelar', pedidosController.cancelar);

export default router;