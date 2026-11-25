import { Router } from 'express';
import { configController } from '../controllers/config.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';
import { sanitizeInput } from '../middlewares/sanitize.middleware.js';

const router = Router();

router.get('/', configController.getPublic);

// sanitizeInput corre después de multer para desinfectar también campos enviados por multipart/form-data
router.put(
  '/',
  authenticate,
  requirePermission('config:editar'),
  uploadSingleImage('logo'),
  sanitizeInput,
  configController.updateStore
);

router.get('/zonas', authenticate, requirePermission('config:editar'), configController.listZones);
router.post('/zonas', authenticate, requirePermission('config:editar'), configController.createZone);
router.put('/zonas/:id', authenticate, requirePermission('config:editar'), configController.updateZone);
router.delete('/zonas/:id', authenticate, requirePermission('config:editar'), configController.deleteZone);

export default router;