import { Router } from 'express';
import { productosController } from '../controllers/productos.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';
import { sanitizeInput } from '../middlewares/sanitize.middleware.js';

const router = Router();

router.get('/', productosController.listPublic);
router.get('/slug/:slug', productosController.getPublicBySlug);

// Las rutas estáticas (/admin) deben declararse antes de /:id para evitar colisiones de parámetros
router.get('/admin', authenticate, requirePermission('productos:ver'), productosController.listAdmin);
router.get('/:id', authenticate, requirePermission('productos:ver'), productosController.getById);

router.post(
  '/',
  authenticate,
  requirePermission('productos:gestionar'),
  uploadSingleImage('imagen'),
  sanitizeInput,
  productosController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('productos:gestionar'),
  uploadSingleImage('imagen'),
  sanitizeInput,
  productosController.update
);

router.patch(
  '/:id/estado',
  authenticate,
  requirePermission('productos:gestionar'),
  productosController.toggleStatus
);

export default router;