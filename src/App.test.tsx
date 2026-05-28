import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Family Files navbar brand', () => {
  render(<App />);
  expect(screen.getByText(/Family Files/i)).toBeInTheDocument();
});
