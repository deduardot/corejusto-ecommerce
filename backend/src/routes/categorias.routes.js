import { Router } from 'express';
import { categoriasController } from '../controllers/categorias.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.get('/', categoriasController.listPublic);

router.get('/admin', authenticate, requirePermission('categorias:gestionar'), categoriasController.listAdmin);
router.post('/', authenticate, requirePermission('categorias:gestionar'), categoriasController.create);
router.put('/:id', authenticate, requirePermission('categorias:gestionar'), categoriasController.update);
router.delete('/:id', authenticate, requirePermission('categorias:gestionar'), categoriasController.remove);

export default router;