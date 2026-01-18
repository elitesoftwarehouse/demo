import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DeskMapView, DeskItem } from '../src/components/dashboard/DeskMapView';

function makeDesks(): DeskItem[] {
  return [
    { id: 'd1', numero: 'A1', status: 'LIBERA', piano: 1, edificio: 'A' },
    { id: 'd2', numero: 'A2', status: 'OCCUPATA', piano: 1, edificio: 'A' },
    { id: 'd3', numero: 'A3', status: 'NON_DISPONIBILE', piano: 1, edificio: 'A' },
  ];
}

describe('DeskMapView', () => {
  it('calls onDeskSelected only for free desks and prepares booking preview', () => {
    const desks = makeDesks();
    const cb = jest.fn();
    const { getByTitle } = render(
      <DeskMapView desks={desks} selectedDate={new Date('2025-05-20T12:00:00')} onDeskSelected={cb} />
    );

    // Click on free desk
    fireEvent.click(getByTitle('Seleziona postazione A1'));
    expect(cb).toHaveBeenCalledTimes(1);
    const [, , preview] = cb.mock.calls[0];
    expect(preview.idPostazione).toBe('d1');
    expect(preview.numeroPostazione).toBe('A1');
    expect(preview.dataPrenotazione).toBe('2025-05-20');

    // Try clicking on occupied -> no additional calls
    fireEvent.click(getByTitle('Postazione non disponibile'));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
