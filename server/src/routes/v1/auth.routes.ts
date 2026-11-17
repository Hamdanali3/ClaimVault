import { Router } from 'express';
import { login, logout, me, refresh, register } from '../../controllers/authController.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refresh);
router.post('/logout', jwtAuth, logout);
router.get('/me', jwtAuth, me);

export default router;
