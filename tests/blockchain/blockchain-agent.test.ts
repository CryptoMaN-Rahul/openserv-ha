import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BlockchainAgent } from '../../src/agents/blockchain/blockchain-agent';
import axios from 'axios';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
process.env.ETHERSCAN_API_KEY = 'test_key';
process.env.CHAINBASE_API_KEY = 'test_key';

describe('BlockchainAgent', () => {
  let agent: BlockchainAgent;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new agent instance for each test
    agent = new BlockchainAgent();
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('Contract Verification', () => {
    it('should check if a contract is verified', async () => {
      // Mock Etherscan API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: '1',
          result: [
            {
              SourceCode: 'contract Test {}',
              ABI: '[]',
              ContractName: 'Test',
              CompilerVersion: '0.8.0'
            }
          ]
        }
      });

      // Call the isContractVerified method
      const isVerified = await (agent as any).isContractVerified('0x1234567890123456789012345678901234567890');
      
      // Check the result
      expect(isVerified).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should return false for unverified contracts', async () => {
      // Mock Etherscan API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: '0',
          result: 'Contract source code not verified'
        }
      });

      // Call the isContractVerified method
      const isVerified = await (agent as any).isContractVerified('0x1234567890123456789012345678901234567890');
      
      // Check the result
      expect(isVerified).toBe(false);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Info', () => {
    it('should fetch token information', async () => {
      // Mock Etherscan API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: '1',
          result: [
            {
              contractAddress: '0x1234567890123456789012345678901234567890',
              tokenName: 'Test Token',
              symbol: 'TEST',
              divisor: '1000000000000000000',
              tokenType: 'ERC20',
              totalSupply: '1000000000000000000000000',
              blueCheckmark: 'false',
              description: 'Test token for unit tests',
              website: 'https://test.com',
              email: 'test@test.com',
              blog: '',
              reddit: '',
              slack: '',
              facebook: '',
              twitter: '',
              bitcointalk: '',
              github: '',
              telegram: '',
              wechat: '',
              linkedin: '',
              discord: '',
              whitepaper: '',
              tokenPriceUSD: '1.23'
            }
          ]
        }
      });

      // Call the getTokenInfo method
      const tokenInfo = await (agent as any).getTokenInfo('0x1234567890123456789012345678901234567890');
      
      // Check the result
      expect(tokenInfo).toEqual({
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000000',
        verified: false,
        description: 'Test token for unit tests',
        website: 'https://test.com',
        socialMedia: {
          email: 'test@test.com',
          twitter: '',
          telegram: '',
          discord: '',
          github: ''
        }
      });
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Holders', () => {
    it('should fetch token holders from Chainbase when API key is available', async () => {
      // Mock Chainbase API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'OK',
          count: 2,
          holders: [
            {
              wallet_address: '0x1111111111111111111111111111111111111111',
              amount: '500000000000000000000000',
              usd_value: '615000'
            },
            {
              wallet_address: '0x2222222222222222222222222222222222222222',
              amount: '500000000000000000000000',
              usd_value: '615000'
            }
          ]
        }
      });

      // Call the getTokenHolders method
      const holders = await (agent as any).getTokenHolders('0x1234567890123456789012345678901234567890');
      
      // Check the result
      expect(holders).toHaveLength(2);
      expect(holders[0].address).toBe('0x1111111111111111111111111111111111111111');
      expect(holders[0].balance).toBe('500000000000000000000000');
      expect(holders[0].percentage).toBe(50);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mock Data Fallback', () => {
    it('should return mock data when API fails', async () => {
      // Mock API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Call the getTokenHolders method
      const holders = await (agent as any).getTokenHolders('0x1234567890123456789012345678901234567890');
      
      // Check the result uses mock data
      expect(holders).toBeDefined();
      expect(holders.length).toBeGreaterThan(0);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk score based on contract and holder data', () => {
      // Test data
      const isVerified = true;
      const contractInfo = { name: 'Test', createdTimestamp: '1600000000' };
      const tokenInfo = { name: 'Test Token', symbol: 'TEST', decimals: 18, totalSupply: '1000000000000000000000000' };
      
      const holderDistribution = [
        { address: '0x1', balance: '500000000000000000000000', percentage: 50 },
        { address: '0x2', balance: '200000000000000000000000', percentage: 20 },
        { address: '0x3', balance: '100000000000000000000000', percentage: 10 },
        { address: '0x4', balance: '100000000000000000000000', percentage: 10 },
        { address: '0x5', balance: '100000000000000000000000', percentage: 10 }
      ];
      
      const transactionHistory = [];
      const securityPatterns = [];

      // Call the calculateBlockchainRiskScore method
      const riskScore = (agent as any).calculateBlockchainRiskScore(
        isVerified, 
        contractInfo, 
        tokenInfo, 
        holderDistribution, 
        transactionHistory, 
        securityPatterns
      );
      
      // Check the result is in the expected range
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
      
      // Since the top holder has 50%, risk score should be higher
      expect(riskScore).toBeGreaterThan(50);
    });
  });
});