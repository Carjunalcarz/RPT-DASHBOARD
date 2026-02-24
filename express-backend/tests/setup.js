const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

// Mock logger to suppress console output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
}));
