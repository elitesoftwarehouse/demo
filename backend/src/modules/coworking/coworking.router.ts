import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  getPostazioniController,
  createPrenotazioneController,
  cancellaPrenotazioneController,
} from './coworking.controller';

const router = Router();

// GET /coworking/postazioni?data=YYYY-MM-DD
router.get('/postazioni', requireAuth, getPostazioniController);

// POST /coworking/prenotazioni { data, postazioneId }
router.post('/prenotazioni', requireAuth, createPrenotazioneController);

// DELETE /coworking/prenotazioni/:id { reason? }
router.delete('/prenotazioni/:id', requireAuth, cancellaPrenotazioneController);

export { router as coworkingRouter };
