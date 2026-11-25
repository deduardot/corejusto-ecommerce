import { Router } from 'express';
import { usuariosController } from '../controllers/usuarios.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('usuarios:ver'), usuariosController.list);
router.get('/:id', requirePermission('usuarios:ver'), usuariosController.getById);
router.post('/', requirePermission('usuarios:gestionar'), usuariosController.create);
router.put('/:id', requirePermission('usuarios:gestionar'), usuariosController.update);
router.patch('/:id/estado', requirePermission('usuarios:gestionar'), usuariosController.toggleStatus);

export default router;