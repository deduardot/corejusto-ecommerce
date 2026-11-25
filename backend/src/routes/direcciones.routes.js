import { Router } from 'express';
import { direccionesController } from '../controllers/direcciones.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', direccionesController.listMine);
router.post('/', direccionesController.create);
router.put('/:id', direccionesController.update);
router.delete('/:id', direccionesController.remove);

export default router;