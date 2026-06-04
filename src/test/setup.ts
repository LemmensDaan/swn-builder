import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

// Guard against cross-test contamination: a test that renders a full-screen
// overlay (PDFViewer / HelpPage / GearEditor) locks <html>/<body> overflow and
// may leave localStorage populated. Reset both after every test so suite order
// can never make one test's side effects flip another's assertions.
afterEach(() => {
  localStorage.clear();
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
});
