import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);
    res.status(201).json({ ok: true, data });
  }),

  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    res.json({ ok: true, data });
  }),

  me: asyncHandler(async (req, res) => {
    res.json({ ok: true, data: req.user });
  })
};