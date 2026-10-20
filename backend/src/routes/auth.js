import { Router } from 'express';
import { register, login, logout, me } from '../controllers/authController.js';
import { registerRules, loginRules } from '../validators/authValidator.js';
import { validate } from '../middleware/validate.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/logout', ensureAuthenticated, logout);
router.get('/me', ensureAuthenticated, me);

export default router;
