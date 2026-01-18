// DeskController - HTTP handlers for postazioni (desks)
// Endpoint: GET /api/postazioni/status -> returns 12 desk statuses
// Response: { success: boolean, data: DeskStatusDTO[], cache: { maxAge: number } }
// Note: Keep consistent labels and state mapping with front-end.

import type { Request, Response } from 'express';
import { DeskService } from '../service/DeskService';
import type { IDeskRepository } from '../repository/DeskRepository';

export class DeskController {
  constructor(private readonly service: DeskService) {}

  static build(repo: IDeskRepository): DeskController {
    return new DeskController(new DeskService(repo));
  }

  // GET /api/postazioni/status
  getStatuses = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.getAllStatuses();

      // Optional light caching headers (few seconds) to reduce server load
      // Front-end can poll; here we opt for max-age=2 seconds as a hint
      res.setHeader('Cache-Control', 'public, max-age=2');

      return res.json({ success: true, data, cache: { maxAge: 2 } });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: 'Internal error' } });
    }
  };
}
