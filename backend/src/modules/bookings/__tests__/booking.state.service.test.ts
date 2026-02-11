import { computeBookingState, toIsoDateUTC, type ComputeStateInput } from '../booking.state.service';

function d(isoDate: string): Date {
  // Construct UTC midnight for given YYYY-MM-DD
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function at(isoDate: string, time: string): Date {
  // Build a UTC timestamp like YYYY-MM-DDTHH:mm:ssZ
  return new Date(`${isoDate}T${time}Z`);
}

describe('booking.state.service - computeBookingState', () => {
  test('Prenotazione futura non cancellata → ATTIVA', () => {
    const now = at('2024-05-10', '12:00:00');
    const input: ComputeStateInput = { date: d('2024-05-11') };
    const state = computeBookingState(input, now);
    expect(state).toBe('ATTIVA');
  });

  test('Prenotazione in corso (oggi) non cancellata → ATTIVA', () => {
    const now = at('2024-05-10', '08:30:00');
    const input: ComputeStateInput = { date: d('2024-05-10') };
    const state = computeBookingState(input, now);
    expect(state).toBe('ATTIVA');
  });

  test('Prenotazione con data/ora di fine nel passato → PASSATA', () => {
    const now = at('2024-05-10', '08:00:00');
    const input: ComputeStateInput = { date: d('2024-05-09') };
    const state = computeBookingState(input, now);
    expect(state).toBe('PASSATA');
  });

  test('Prenotazione marcata come cancellata prima dell’inizio → CANCELLATA', () => {
    const now = at('2024-05-10', '08:00:00');
    const input: ComputeStateInput = { date: d('2024-05-11'), canceled: true };
    const state = computeBookingState(input, now);
    expect(state).toBe('CANCELLATA');
  });

  test('Prenotazione marcata come cancellata dopo l’inizio → CANCELLATA (priorità su PASSATA/ATTIVA)', () => {
    const now = at('2024-05-10', '08:00:00');
    // anche se la data è nel passato, la cancellazione deve prevalere
    const inputPast: ComputeStateInput = { date: d('2024-05-09'), canceled: true };
    expect(computeBookingState(inputPast, now)).toBe('CANCELLATA');

    // anche se la data è oggi (sarebbe ATTIVA), la cancellazione deve prevalere
    const inputToday: ComputeStateInput = { date: d('2024-05-10'), canceled: true };
    expect(computeBookingState(inputToday, now)).toBe('CANCELLATA');
  });

  test('Priorità delle regole: CANCELLATA ha precedenza su PASSATA/ATTIVA', () => {
    const now = at('2024-05-10', '10:00:00');
    const dates = ['2024-05-09', '2024-05-10', '2024-05-11'];
    for (const iso of dates) {
      const input: ComputeStateInput = { date: d(iso), canceled: true };
      expect(computeBookingState(input, now)).toBe('CANCELLATA');
    }
  });

  test('Gestione timezone: confini di giornata UTC', () => {
    // Al limite superiore della giornata: 23:59:59Z del 2024-01-01
    let now = at('2024-01-01', '23:59:59');
    expect(computeBookingState({ date: d('2024-01-01') }, now)).toBe('ATTIVA');

    // Al tick successivo (00:00:00Z del giorno dopo) diventa PASSATA
    now = at('2024-01-02', '00:00:00');
    expect(computeBookingState({ date: d('2024-01-01') }, now)).toBe('PASSATA');
  });
});

describe('booking.state.service - toIsoDateUTC', () => {
  test('Ritorna YYYY-MM-DD calcolato in UTC per input con offset negativo', () => {
    // 2024-01-01T23:00:00-02:00 == 2024-01-02T01:00:00Z → ISO date: 2024-01-02
    const input = new Date('2024-01-01T23:00:00-02:00');
    expect(toIsoDateUTC(input)).toBe('2024-01-02');
  });

  test('Ritorna YYYY-MM-DD calcolato in UTC per input con offset positivo', () => {
    // 2024-01-01T00:00:00+02:00 == 2023-12-31T22:00:00Z → ISO date: 2023-12-31
    const input = new Date('2024-01-01T00:00:00+02:00');
    expect(toIsoDateUTC(input)).toBe('2023-12-31');
  });

  test('Idempotenza su ISO UTC puro', () => {
    const input = new Date('2024-06-15T00:00:00.000Z');
    expect(toIsoDateUTC(input)).toBe('2024-06-15');
  });
});
