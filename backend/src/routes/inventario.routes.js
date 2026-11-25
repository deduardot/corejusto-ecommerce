import { Router } from 'express';
import { inventarioController } from '../controllers/inventario.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/lotes', requirePermission('inventario:ver'), inventarioController.listLotes);
router.post('/lotes', requirePermission('inventario:ingresar_lote'), inventarioController.ingresarLote);
router.patch('/lotes/:id/anular', requirePermission('inventario:ajustar'), inventarioController.anularLote);

router.post('/ajustes/merma', requirePermission('inventario:ajustar'), inventarioController.registrarMerma);
router.get('/kardex', requirePermission('inventario:ver_kardex'), inventarioController.listKardex);
router.get('/alertas', requirePermission('inventario:ver'), inventarioController.listAlertas);
router.get('/valorizacion', requirePermission('inventario:ver'), inventarioController.getValorizacion);
router.post('/simular-fifo', requirePermission('inventario:ver'), inventarioController.simularFifo);

export default router;