// Minimal Express-like controller exposing GET /api/desks
import type { Request, Response } from 'express';
import type { IDesksRepository } from '../repository/DesksRepository';
import { DesksService } from '../service/DesksService';

export class DesksController {
  constructor(private readonly service: DesksService) {}

  static build(repo: IDesksRepository): DesksController {
    return new DesksController(new DesksService(repo));
  }

  // GET /api/desks
  getDesks = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.getDesks();
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: 'Internal error' } });
    }
  };
}
