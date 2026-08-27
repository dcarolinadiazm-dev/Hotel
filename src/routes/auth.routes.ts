import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', verifyToken, AuthController.verifySession);

export default router;
