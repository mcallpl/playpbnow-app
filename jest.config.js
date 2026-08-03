module.exports = {
  testPathIgnorePatterns: ['/node_modules/'],
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
    'utils/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  // This block was spelled `coverageThresholds` (plural), so Jest ignored it
  // and the 70% gate it declared had never once run. Enforced for the first
  // time, real coverage was ~8%; a gate that can only ever fail is a gate
  // everyone learns to skip.
  //
  // These sit just under the current numbers and act as a ratchet: they fail if
  // coverage drops, and get raised as suites land. 70% is still the
  // destination, not the starting line.
  coverageThreshold: {
    global: {
      branches: 11,
      functions: 11,
      lines: 12,
      statements: 12,
    },
  },
};
