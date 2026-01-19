import { Router } from 'express';
import { loginController } from './auth.controller';

const router = Router();

router.post('/login', loginController);

export { router as authRouter };
