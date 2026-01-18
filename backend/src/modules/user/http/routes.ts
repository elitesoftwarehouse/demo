import { Router } from 'express';
import type { IUserRepository } from '../repository/UserRepository';
import { AuthController } from './AuthController';
import { jwtAuthGuard } from '../../auth/http';

// Registers auth routes on the provided router under /api/auth
// Example: router -> app, use app.use('/', registerAuthRoutes(router, repo))
export function registerAuthRoutes(router: Router, usersRepo: IUserRepository): Router {
  const ctrl = AuthController.build(usersRepo);

  router.post('/api/auth/signup', ctrl.signup);
  router.post('/api/auth/login', ctrl.login);
  router.post('/api/auth/refresh', ctrl.refresh);
  router.post('/api/auth/logout', jwtAuthGuard(), ctrl.logout);

  // Example protected route pattern (placeholder): returns current user info
  router.get('/api/auth/me', jwtAuthGuard(), (req: any, res) => {
    const user = req.user || null;
    if (!user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    return res.json({ success: true, data: { id: user.id, email: user.email, roles: user.roles || [] } });
  });

  // Apply JWT guard to all private endpoints
  router.use('/api/private', jwtAuthGuard());

  // Example private endpoint
  router.get('/api/private/health', (req: any, res) => {
    return res.json({ success: true, data: { status: 'ok', userId: req.user?.id } });
  });

  return router;
}
