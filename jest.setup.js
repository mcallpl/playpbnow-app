import '@testing-library/jest-dom';

// Mock AsyncStorage.
// Every method must resolve a promise: the real module always returns one, and
// app code chains off it (ThemeContext does AsyncStorage.setItem(...).catch()).
// Returning bare jest.fn() gave back undefined and threw "Cannot read properties
// of undefined (reading 'catch')" inside the component under test.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
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

// react-native-purchases reaches for a native module at import time, which takes
// down every suite that transitively imports SubscriptionContext (Game screen,
// Setup screen). Mock the surface the app actually uses.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn().mockResolvedValue({ current: null, all: {} }),
    purchasePackage: jest.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
    restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    setLogLevel: jest.fn(),
    logIn: jest.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
}));
