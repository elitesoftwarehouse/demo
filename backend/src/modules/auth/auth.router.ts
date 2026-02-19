import { Router } from 'express';
import { loginController, refreshController } from './auth.controller';

const router = Router();

router.post('/login', loginController);
router.post('/refresh', refreshController);

export { router as authRouter };
