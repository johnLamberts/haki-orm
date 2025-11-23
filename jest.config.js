module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: '<rootDir>/jest.setup.ts',
    
  // Test files
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@advanced/(.*)$': '<rootDir>/src/advanced/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // Transform
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Timeouts
  testTimeout: 30000,
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Reporter
  verbose: true,
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // Clear mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
