module.exports = {
  // specs for components that do not exist yet — see __tests__/pending/README.md
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/pending/'],
  // jest-expo, not 'react-native': the bare RN preset does not strip Flow types
  // out of react-native's own jest/setup.js, so every suite died at parse time
  // before a single test ran. jest-expo is the supported preset for Expo apps
  // and handles the node_modules transform correctly.
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
