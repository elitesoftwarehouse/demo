import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginController(req: Request, res: Response) {
  // Basic request logging without sensitive data
  console.log('Login attempt', {
    path: req.path,
    ip: req.ip,
    ua: req.headers['user-agent'],
  });

  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parse.error.flatten(),
    });
  }

  try {
    const result = await authService.login(parse.data);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err?.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (err?.code === 'USER_FORBIDDEN') {
      return res.status(403).json({ error: 'User is not allowed to login' });
    }
    console.error('Login error', { message: err?.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
