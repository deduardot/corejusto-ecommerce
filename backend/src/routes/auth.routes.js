import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, mensaje: 'Demasiados intentos de acceso. Intenta nuevamente en 15 minutos.' }
});

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticate, authController.me);

export default router;