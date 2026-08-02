import '@testing-library/jest-dom';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock React Native modules.
// NativeAnimatedHelper moved in newer React Native versions, so mocking it by
// its old path throws "module not found" and takes every suite down with it.
// jest-expo already mocks the native animation layer, so this is only a
// belt-and-braces guard for RN versions that still expose the old path.
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // path no longer exists in this RN version — jest-expo has it covered
}

// Mock fetch globally
global.fetch = jest.fn();

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
