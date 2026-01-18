import React from 'react';
import { SelectedDateProvider } from './lib/date/SelectedDateContext';

const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <SelectedDateProvider>{children}</SelectedDateProvider>;
};

export default AppProviders;
