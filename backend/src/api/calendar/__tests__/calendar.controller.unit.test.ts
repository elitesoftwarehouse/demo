import { getDisabledDatesHandler } from '../calendar.controller';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; },
  };
  return res;
}

describe('calendar.controller - getDisabledDatesHandler', () => {
  test('400 when missing params', async () => {
    const res = makeRes();
    await getDisabledDatesHandler({ query: {} } as any, res);
    expect(res.statusCode).toBe(400);
  });

  test('400 when invalid format', async () => {
    const res = makeRes();
    await getDisabledDatesHandler({ query: { from: '2026/01/01', to: '2026-01-10' } } as any, res);
    expect(res.statusCode).toBe(400);
  });

  test('400 when range too large', async () => {
    const res = makeRes();
    await getDisabledDatesHandler({ query: { from: '2026-01-01', to: '2027-12-31' } } as any, res);
    expect(res.statusCode).toBe(400);
  });

  test('200 and returns array', async () => {
    const res = makeRes();
    await getDisabledDatesHandler({ query: { from: '2026-04-01', to: '2026-04-10' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body && (res.body as any).disabledDates)).toBe(true);
  });
});
