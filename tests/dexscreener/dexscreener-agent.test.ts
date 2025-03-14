import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DexScreenerAgent } from '../../src/agents/dexscreener/dexscreener-agent';
import axios from 'axios';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
process.env.GEMINI_API_KEY = 'test_key';

describe('DexScreenerAgent', () => {
  let agent: DexScreenerAgent;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new agent instance for each test
    agent = new DexScreenerAgent();
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('DexScreener API', () => {
    it('should fetch token pairs from DexScreener API', async () => {
      // Mock DexScreener API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          pairs: [
            {
              chainId: 'ethereum',
              dexId: 'uniswap',
              url: 'https://dexscreener.com/ethereum/0x1234...',
              pairAddress: '0x1234567890123456789012345678901234567890',
              baseToken: {
                address: '0xabcdef1234567890abcdef1234567890abcdef12',
                name: 'Test Token',
                symbol: 'TEST'
              },
              quoteToken: {
                address: '0x0000000000000000000000000000000000000000',
                name: 'Ethereum',
                symbol: 'ETH'
              },
              priceNative: '0.05',
              priceUsd: '100',
              txns: {
                h1: { buys: 10, sells: 5 },
                h24: { buys: 50, sells: 30 },
                h6: { buys: 25, sells: 15 },
                m5: { buys: 500, sells: 300 }
              },
              volume: {
                h1: 10000,
                h24: 100000,
                h6: 50000,
                m5: 500000
              },
              priceChange: {
                h1: 1.5,
                h24: 5.2,
                h6: 3.1,
                m5: 10.5
              },
              liquidity: {
                usd: 2000000,
                base: 10000,
                quote: 500
              },
              fdv: 20000000,
              pairCreatedAt: 1617235200
            },
            {
              chainId: 'bsc',
              dexId: 'pancakeswap',
              url: 'https://dexscreener.com/bsc/0x5678...',
              pairAddress: '0x5678901234567890123456789012345678901234',
              baseToken: {
                address: '0xabcdef1234567890abcdef1234567890abcdef12',
                name: 'Test Token',
                symbol: 'TEST'
              },
              quoteToken: {
                address: '0x0000000000000000000000000000000000000000',
                name: 'BNB',
                symbol: 'BNB'
              },
              priceNative: '0.1',
              priceUsd: '95',
              txns: {
                h1: { buys: 20, sells: 10 },
                h24: { buys: 100, sells: 50 },
                h6: { buys: 50, sells: 25 },
                m5: { buys: 1000, sells: 500 }
              },
              volume: {
                h1: 20000,
                h24: 200000,
                h6: 100000,
                m5: 1000000
              },
              priceChange: {
                h1: 0.5,
                h24: 3.2,
                h6: 1.5,
                m5: 8.5
              },
              liquidity: {
                usd: 1000000,
                base: 5000,
                quote: 250
              },
              fdv: 19000000,
              pairCreatedAt: 1617321600
            }
          ]
        }
      });

      // Call the getTokenPairs method
      const pairs = await (agent as any).getTokenPairs('TEST');
      
      // Check the result
      expect(pairs).toHaveLength(2);
      expect(pairs[0].baseToken.symbol).toBe('TEST');
      expect(pairs[0].liquidity.usd).toBe(2000000);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://api.dexscreener.com/latest/dex/search'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Call the getTokenPairs method
      const pairs = await (agent as any).getTokenPairs('TEST');
      
      // Check the result
      expect(pairs).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('DEX Risk Assessment', () => {
    it('should assess DEX risk based on multiple factors', async () => {
      // Mock token pairs data
      const tokenPairs = [
        {
          chainId: 'ethereum',
          dexId: 'uniswap',
          pairAddress: '0x1234567890123456789012345678901234567890',
          baseToken: {
            name: 'Test Token',
            symbol: 'TEST'
          },
          quoteToken: {
            name: 'Ethereum',
            symbol: 'ETH'
          },
          priceUsd: '100',
          txns: {
            h24: { buys: 50, sells: 30 }
          },
          volume: {
            h24: 100000
          },
          priceChange: {
            h24: 5.2
          },
          liquidity: {
            usd: 2000000
          },
          fdv: 20000000,
          pairCreatedAt: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 // 30 days ago
        }
      ];

      // Mock the getTokenPairs method
      (agent as any).getTokenPairs = jest.fn().mockResolvedValue(tokenPairs);
      
      // Call the assessDexRisk method
      const riskAssessment = await (agent as any).assessDexRisk('TEST');
      
      // Check the risk assessment
      expect(riskAssessment).toBeDefined();
      expect(riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.riskScore).toBeLessThanOrEqual(100);
      expect(riskAssessment.riskLevel).toBeDefined();
      expect(['Low', 'Medium', 'High']).toContain(riskAssessment.riskLevel);
      expect(riskAssessment.riskFactors).toBeDefined();
      expect(Array.isArray(riskAssessment.riskFactors)).toBe(true);
    });

    it('should identify liquidity risk factors correctly', () => {
      // Test token pair with low liquidity
      const tokenPair = {
        liquidity: { usd: 50000 }, // Very low liquidity
        volume: { h24: 20000 },
        txns: { h24: { buys: 20, sells: 10 } },
        pairCreatedAt: Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60 // 5 days ago
      };

      // Call the identifyLiquidityRiskFactors method
      const riskFactors = (agent as any).identifyLiquidityRiskFactors(tokenPair);
      
      // Check that low liquidity risk was identified
      expect(riskFactors.length).toBeGreaterThan(0);
      expect(riskFactors.some(factor => factor.includes('liquidity'))).toBe(true);
    });

    it('should assess trading volume patterns', () => {
      // Test token pair with imbalanced buy/sell ratio
      const tokenPair = {
        volume: { h24: 100000 },
        txns: { h24: { buys: 100, sells: 10 } }, // 10:1 buy/sell ratio (unusual)
        liquidity: { usd: 1000000 }
      };

      // Call the assessTradingPatterns method
      const tradingPatterns = (agent as any).assessTradingPatterns(tokenPair);
      
      // Check the trading patterns
      expect(tradingPatterns).toBeDefined();
      expect(tradingPatterns.buySellRatio).toBe(10); // 100 buys / 10 sells
      expect(tradingPatterns.volumePerTx).toBe(909.09); // 100000 / (100 + 10)
      expect(tradingPatterns.suspicious).toBe(true); // Ratio is too imbalanced
    });

    it('should calculate overall DEX risk score', () => {
      // Test data
      const liquidityUsd = 500000; // Moderate liquidity
      const pairAge = 15; // 15 days old
      const buySellRatio = 3; // Slightly imbalanced
      const priceImpact = 2.5; // Moderate impact
      const majorDex = true; // Major DEX
      
      // Call the calculateDexRiskScore method
      const riskScore = (agent as any).calculateDexRiskScore(
        liquidityUsd, 
        pairAge, 
        buySellRatio, 
        priceImpact, 
        majorDex
      );
      
      // Check the result
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });

    it('should determine risk level based on score', () => {
      // Test with different risk scores
      expect((agent as any).determineRiskLevel(25)).toBe('Low');
      expect((agent as any).determineRiskLevel(50)).toBe('Medium');
      expect((agent as any).determineRiskLevel(75)).toBe('High');
    });
  });

  describe('DEX Analytics', () => {
    it('should calculate price impact', () => {
      // Test data - $10,000 trade against $500,000 liquidity
      const tradeAmountUsd = 10000;
      const liquidityUsd = 500000;
      
      // Call the calculatePriceImpact method
      const priceImpact = (agent as any).calculatePriceImpact(tradeAmountUsd, liquidityUsd);
      
      // Check the result
      expect(priceImpact).toBeCloseTo(1.96, 2); // ~2% price impact
    });

    it('should calculate pair age in days', () => {
      // Test with a timestamp from one week ago
      const oneWeekAgoTimestamp = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      
      // Call the calculatePairAgeInDays method
      const pairAge = (agent as any).calculatePairAgeInDays(oneWeekAgoTimestamp);
      
      // Check the result (should be ~7 days)
      expect(pairAge).toBeCloseTo(7, 0);
    });

    it('should check if pair is on a major DEX', () => {
      // Test with major DEXes
      expect((agent as any).isOnMajorDex('uniswap')).toBe(true);
      expect((agent as any).isOnMajorDex('sushiswap')).toBe(true);
      expect((agent as any).isOnMajorDex('pancakeswap')).toBe(true);
      
      // Test with minor DEX
      expect((agent as any).isOnMajorDex('unknown_dex')).toBe(false);
    });
  });
}); 