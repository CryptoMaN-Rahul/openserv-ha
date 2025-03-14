// Set up environment variables for testing
process.env.ETHERSCAN_API_KEY = 'test_etherscan_key';
process.env.CHAINBASE_API_KEY = 'test_chainbase_key';
process.env.TWITTER_BEARER_TOKEN = 'test_twitter_token';
process.env.COINGECKO_API_KEY = 'test_coingecko_key';
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.RPC_PROVIDER_URL = 'https://eth.llamarpc.com';

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(), // Keep warnings visible
  error: jest.fn(), // Keep errors visible
}; 