import '@testing-library/jest-dom';

// Extend expect with custom matchers from jest-dom
expect.extend({});

// Set up global test timeouts (optional)
jest.setTimeout(10000); // 10 seconds

// Mock global fetch if needed
global.fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Optional: Mock window properties that might be missing in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 