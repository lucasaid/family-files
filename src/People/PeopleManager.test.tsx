import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import PeopleManager from './PeopleManager';

(window as any).require = () => ({
  promises: { writeFile: vi.fn().mockResolvedValue(undefined), readFile: vi.fn().mockRejectedValue(new Error()) },
});

function renderWithContext(ui: React.ReactElement) {
  return render(<AppProvider><MemoryRouter>{ui}</MemoryRouter></AppProvider>);
}

test('renders empty state message', () => {
  renderWithContext(<PeopleManager />);
  expect(screen.getByText(/No people/i)).toBeInTheDocument();
});

test('add person button shows input', () => {
  renderWithContext(<PeopleManager />);
  fireEvent.click(screen.getByText(/Add person/i));
  expect(screen.getByPlaceholderText(/Name/i)).toBeInTheDocument();
});
