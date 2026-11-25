import { Router } from 'express';
import { rolesController } from '../controllers/roles.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/permisos', requirePermission('roles:ver'), rolesController.listPermissions);
router.get('/', requirePermission('roles:ver'), rolesController.listRoles);
router.post('/', requirePermission('roles:gestionar'), rolesController.createRole);
router.put('/:id', requirePermission('roles:gestionar'), rolesController.updateRole);
router.delete('/:id', requirePermission('roles:gestionar'), rolesController.deleteRole);

export default router;