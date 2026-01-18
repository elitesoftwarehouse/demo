import { InMemoryBookingsRepository, type Booking } from '../../../src/modules/bookings/repository/BookingsRepository';

describe('InMemoryBookingsRepository.findByUserOrdered', () => {
  const uidA = 'user-A';
  const uidB = 'user-B';

  const seed: Booking[] = [
    // Past bookings
    { id: 'p1', userId: uidA, deskId: 'D1', date: '2024-01-10', timeSlot: '09:00', status: 'CONFIRMED' },
    { id: 'p2', userId: uidA, deskId: 'D2', date: '2024-03-01', timeSlot: '14:00', status: 'PENDING' },
    { id: 'p3', userId: uidA, deskId: 'D3', date: '2023-12-31', status: 'CANCELLED' },
    // Future/today bookings
    { id: 'f1', userId: uidA, deskId: 'D1', date: '2025-06-15', timeSlot: '09:00', status: 'CONFIRMED' },
    { id: 'f2', userId: uidA, deskId: 'D2', date: '2025-06-15', timeSlot: '14:00', status: 'CONFIRMED' },
    { id: 'f3', userId: uidA, deskId: 'D3', date: '2025-06-16', status: 'PENDING' },

    // Other user bookings (should be excluded)
    { id: 'o1', userId: uidB, deskId: 'DX', date: '2025-07-01', timeSlot: '09:00', status: 'CONFIRMED' },
  ];

  const now = new Date(Date.UTC(2025, 5, 15, 8, 0, 0)); // 2025-06-15 08:00 UTC

  it('filters by user and orders: future/today ascending, then past descending', async () => {
    const repo = new InMemoryBookingsRepository(seed);

    const res = await repo.findByUserOrdered(uidA, { now });

    // Expected order:
    // Future/today ascending: f1 (09:00), f2 (14:00), f3 (2025-06-16)
    // Past descending: p2 (2024-03-01 14:00), p1 (2024-01-10 09:00), p3 (2023-12-31)
    expect(res.items.map((b) => b.id)).toEqual(['f1', 'f2', 'f3', 'p2', 'p1', 'p3']);
    expect(res.total).toBe(6);
  });

  it('handles same date/time with tie-breakers: status (lex) then id', async () => {
    const seed2: Booking[] = [
      { id: 'a', userId: uidA, deskId: 'D1', date: '2025-06-20', timeSlot: '10:00', status: 'PENDING' },
      { id: 'b', userId: uidA, deskId: 'D1', date: '2025-06-20', timeSlot: '10:00', status: 'CONFIRMED' },
      { id: 'c', userId: uidA, deskId: 'D1', date: '2025-06-20', timeSlot: '10:00', status: 'CANCELLED' },
    ];
    const repo = new InMemoryBookingsRepository(seed2);
    const res = await repo.findByUserOrdered(uidA, { now });
    // Lex order: CANCELLED < CONFIRMED < PENDING
    expect(res.items.map((b) => b.id)).toEqual(['c', 'b', 'a']);
  });

  it('only future bookings', async () => {
    const seed3: Booking[] = [
      { id: 'f1', userId: uidA, deskId: 'D', date: '2025-06-20', timeSlot: '10:00', status: 'CONFIRMED' },
      { id: 'f2', userId: uidA, deskId: 'D', date: '2025-06-21', timeSlot: '09:00', status: 'CONFIRMED' },
    ];
    const repo = new InMemoryBookingsRepository(seed3);
    const res = await repo.findByUserOrdered(uidA, { now });
    expect(res.items.map((b) => b.id)).toEqual(['f1', 'f2']);
  });

  it('only past bookings', async () => {
    const seed4: Booking[] = [
      { id: 'p1', userId: uidA, deskId: 'D', date: '2024-01-01', timeSlot: '10:00', status: 'CONFIRMED' },
      { id: 'p2', userId: uidA, deskId: 'D', date: '2024-01-02', timeSlot: '10:00', status: 'CONFIRMED' },
    ];
    const repo = new InMemoryBookingsRepository(seed4);
    const res = await repo.findByUserOrdered(uidA, { now });
    // Past descending
    expect(res.items.map((b) => b.id)).toEqual(['p2', 'p1']);
  });

  it('returns empty when no bookings for user', async () => {
    const repo = new InMemoryBookingsRepository(seed);
    const res = await repo.findByUserOrdered('unknown', { now });
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });

  it('supports pagination', async () => {
    const repo = new InMemoryBookingsRepository(seed);
    const res1 = await repo.findByUserOrdered(uidA, { now, page: 1, pageSize: 2 });
    const res2 = await repo.findByUserOrdered(uidA, { now, page: 2, pageSize: 2 });
    const res3 = await repo.findByUserOrdered(uidA, { now, page: 3, pageSize: 2 });
    expect(res1.items.map((b) => b.id)).toEqual(['f1', 'f2']);
    expect(res2.items.map((b) => b.id)).toEqual(['f3', 'p2']);
    expect(res3.items.map((b) => b.id)).toEqual(['p1', 'p3']);
  });
});
