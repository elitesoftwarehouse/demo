import React from 'react';
import { render } from '@testing-library/react';
import DashboardPostazioni from '../../src/components/DashboardPostazioni';

jest.mock('../../src/lib/desksApi', () => ({ fetchDesks: jest.fn() }));
const { fetchDesks } = require('../../src/lib/desksApi');

it('matches snapshot for a 3-item layout', async () => {
  fetchDesks.mockResolvedValue({
    total: 3,
    expected: 12,
    missing: 9,
    items: [
      { id: 'D1', name: 'Desk 1', status: 'FREE' },
      { id: 'D2', name: 'Desk 2', status: 'OCCUPIED' },
      { id: 'D3', name: 'Desk 3', status: 'UNAVAILABLE' },
    ],
    statusCount: { FREE: 1, OCCUPIED: 1, UNAVAILABLE: 1 },
  });

  const { container, findByLabelText } = render(<DashboardPostazioni baseUrl="" refreshMs={0} />);
  await findByLabelText('dashboard');
  expect(container.firstChild).toMatchSnapshot();
});
