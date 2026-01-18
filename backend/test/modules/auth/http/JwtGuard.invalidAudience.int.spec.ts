import * as express from 'express';
const request = require('supertest');
import { jwtAuthGuard } from '../../../../src/modules/auth/http';
import { JwtService } from '../../../../src/core/security/JwtService';

describe('JWT Guard - invalid audience', () => {
  it('rejects when audience mismatch', async () => {
    const signer = new JwtService({ issuer: 'iss', audience: 'aud-1', accessSecret: 'S1', accessTtl: '60s' });
    const verifier = new JwtService({ issuer: 'iss', audience: 'aud-2', accessSecret: 'S1', accessTtl: '60s' });

    const app = express();
    app.get('/p', jwtAuthGuard({ jwt: verifier }), (req: any, res: any) => res.json({}));

    const { token } = signer.signAccessToken('u', 'u@example.com');
    const res = await request(app).get('/p').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
