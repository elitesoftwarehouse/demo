import { getDesksStatusHandler } from '../desks.controller';

// declare jest
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const jest: any;

function makeRes() {
  const store: any = { statusCode: 0, body: undefined };
  return {
    status(code: number) { store.statusCode = code; return this; },
    json(payload: any) { store.body = payload; },
    get data() { return store; },
  } as any;
}

describe('desks.controller - integration style', () => {
  test('returns 200 and array of 12 desks with expected fields', async () => {
    const res = makeRes();
    await getDesksStatusHandler({} as any, res);
    expect(res.data.statusCode).toBe(200);
    const arr = res.data.body?.desks;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(12);
    const first = arr[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('x');
    expect(first).toHaveProperty('y');
    expect(['free','busy','unavailable']).toContain(first.status);
  });
});
