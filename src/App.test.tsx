import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Family Browser navbar brand', () => {
  render(<App />);
  expect(screen.getByText(/Family Browser/i)).toBeInTheDocument();
});
