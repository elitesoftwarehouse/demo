import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password troppo corta'),
});

export async function loginController(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const result = await authService.login({ email, password, userAgent: req.headers['user-agent'] || 'unknown' });

    return res.status(200).json(result);
  } catch (err: any) {
    const status = err.statusCode || 500;
    const message = err.message || 'Errore interno';
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Login attempt failed', { email: req.body?.email, status, reason: message });
    }
    if (status === 401 || status === 403 || status === 400) {
      return res.status(status).json({ error: message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
