import { Router } from 'express';
import { proveedoresController } from '../controllers/proveedores.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.get('/', proveedoresController.listPublic);

router.get('/admin', authenticate, requirePermission('proveedores:gestionar'), proveedoresController.listAdmin);
router.post('/', authenticate, requirePermission('proveedores:gestionar'), proveedoresController.create);
router.put('/:id', authenticate, requirePermission('proveedores:gestionar'), proveedoresController.update);
router.delete('/:id', authenticate, requirePermission('proveedores:gestionar'), proveedoresController.remove);

export default router;