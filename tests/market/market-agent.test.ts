import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MarketAnalysisAgent } from '../../src/agents/market/market-agent';
import axios from 'axios';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
process.env.COINGECKO_API_KEY = 'test_key';
process.env.GEMINI_API_KEY = 'test_key';

describe('MarketAnalysisAgent', () => {
  let agent: MarketAnalysisAgent;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new agent instance for each test
    agent = new MarketAnalysisAgent();
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('CoinGecko API', () => {
    it('should fetch coin data from CoinGecko', async () => {
      // Mock CoinGecko API response for coin data
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          market_data: {
            current_price: {
              usd: 50000
            },
            market_cap: {
              usd: 1000000000000
            },
            total_volume: {
              usd: 30000000000
            },
            price_change_percentage_24h: 5.25,
            price_change_percentage_7d: 10.5,
            price_change_percentage_30d: -2.3,
            high_24h: {
              usd: 51000
            },
            low_24h: {
              usd: 49000
            }
          }
        }
      });

      // Call the getCoinData method
      const coinData = await (agent as any).getCoinData('bitcoin');
      
      // Check the result
      expect(coinData).toBeDefined();
      expect(coinData.name).toBe('Bitcoin');
      expect(coinData.symbol).toBe('btc');
      expect(coinData.market_data.current_price.usd).toBe(50000);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://api.coingecko.com/api/v3/coins/bitcoin'),
        expect.any(Object)
      );
    });

    it('should fetch market chart data from CoinGecko', async () => {
      // Mock CoinGecko API response for market chart
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          prices: [
            [1617235200000, 58000],
            [1617321600000, 59000],
            [1617408000000, 60000]
          ],
          market_caps: [
            [1617235200000, 1000000000000],
            [1617321600000, 1050000000000],
            [1617408000000, 1100000000000]
          ],
          total_volumes: [
            [1617235200000, 70000000000],
            [1617321600000, 75000000000],
            [1617408000000, 80000000000]
          ]
        }
      });

      // Call the getMarketChartData method
      const chartData = await (agent as any).getMarketChartData('bitcoin', 7);
      
      // Check the result
      expect(chartData).toBeDefined();
      expect(chartData.prices).toHaveLength(3);
      expect(chartData.market_caps).toHaveLength(3);
      expect(chartData.total_volumes).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart'),
        expect.any(Object)
      );
    });

    it('should use mock data when API fails', async () => {
      // Mock API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Call the getCoinData method
      const coinData = await (agent as any).getCoinData('unknown_coin');
      
      // Check mock data is returned
      expect(coinData).toBeDefined();
      expect(coinData.name).toBeDefined();
      expect(coinData.market_data).toBeDefined();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Price Volatility Analysis', () => {
    it('should calculate volatility from price data', () => {
      // Test price data
      const prices = [
        [1617235200000, 58000],
        [1617321600000, 59000],
        [1617408000000, 60000],
        [1617494400000, 57000],
        [1617580800000, 59500]
      ];

      // Call the calculateVolatility method
      const volatility = (agent as any).calculateVolatility(prices);
      
      // Check the result is a number and reasonable
      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThan(100); // Volatility shouldn't be extremely high for this data
    });

    it('should return zero volatility for empty data', () => {
      // Call the calculateVolatility method with empty data
      const volatility = (agent as any).calculateVolatility([]);
      
      // Check the result is zero
      expect(volatility).toBe(0);
    });
  });

  describe('Market Metrics Analysis', () => {
    it('should calculate volume to market cap ratio', () => {
      // Test data
      const volume = 30000000000;
      const marketCap = 1000000000000;

      // Call the calculateVolumeToMarketCapRatio method
      const ratio = (agent as any).calculateVolumeToMarketCapRatio(volume, marketCap);
      
      // Check the result
      expect(ratio).toBe(0.03); // 30B / 1T = 0.03
    });

    it('should analyze market data and calculate risk score', async () => {
      // Mock coin data
      const coinData = {
        name: 'Bitcoin',
        symbol: 'btc',
        market_data: {
          current_price: { usd: 50000 },
          market_cap: { usd: 1000000000000 },
          total_volume: { usd: 30000000000 },
          price_change_percentage_24h: 5.25,
          price_change_percentage_7d: 10.5,
          price_change_percentage_30d: -2.3
        }
      };

      // Mock chart data
      const chartData = {
        prices: [
          [1617235200000, 58000],
          [1617321600000, 59000],
          [1617408000000, 60000],
          [1617494400000, 57000],
          [1617580800000, 59500]
        ]
      };

      // Mock the API methods
      (agent as any).getCoinData = jest.fn().mockResolvedValue(coinData);
      (agent as any).getMarketChartData = jest.fn().mockResolvedValue(chartData);
      
      // Call the analyzeMarketData method
      const analysisResult = await (agent as any).analyzeMarketData('bitcoin');
      
      // Check the analysis result
      expect(analysisResult).toBeDefined();
      expect(analysisResult.price).toBe(50000);
      expect(analysisResult.marketCap).toBe(1000000000000);
      expect(analysisResult.volume).toBe(30000000000);
      expect(analysisResult.priceChange24h).toBe(5.25);
      expect(analysisResult.volumeToMarketCapRatio).toBe(0.03);
      expect(analysisResult.volatility).toBeGreaterThanOrEqual(0);
      expect(analysisResult.riskScore).toBeGreaterThanOrEqual(0);
      expect(analysisResult.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate market risk score based on various factors', () => {
      // Set up test data
      const marketCap = 1000000000000; // $1T (very large)
      const priceChange24h = -15; // 15% drop (risky)
      const volumeToMarketCapRatio = 0.01; // Low volume relative to market cap (less liquid)
      const volatility = 25; // High volatility (risky)
      
      // Call the calculateMarketRiskScore method
      const riskScore = (agent as any).calculateMarketRiskScore(marketCap, priceChange24h, volumeToMarketCapRatio, volatility);
      
      // Check the result
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
      
      // With high volatility and negative price change, the risk score should be higher
      expect(riskScore).toBeGreaterThan(50);
    });

    it('should identify risk factors correctly', () => {
      // Test data with several risk factors
      const analysisData = {
        price: 50000,
        marketCap: 10000000, // Very low market cap
        volume: 1000000, // Low volume
        priceChange24h: -20, // Sharp decline
        priceChange7d: -35, // Sustained decline
        volumeToMarketCapRatio: 0.01, // Low liquidity
        volatility: 40 // High volatility
      };
      
      // Call the identifyRiskFactors method
      const riskFactors = (agent as any).identifyRiskFactors(analysisData);
      
      // Check that risk factors were identified
      expect(riskFactors.length).toBeGreaterThan(0);
      expect(riskFactors.some(factor => factor.includes('market cap'))).toBe(true);
      expect(riskFactors.some(factor => factor.includes('price decline'))).toBe(true);
      expect(riskFactors.some(factor => factor.includes('volatility'))).toBe(true);
    });
  });
}); 