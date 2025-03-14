import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AnalysisAgent } from '../../src/agents/analysis';
import { BlockchainAgent } from '../../src/agents/blockchain/blockchain-agent';
import { SocialMediaAgent } from '../../src/agents/social/social-agent';
import { MarketAnalysisAgent } from '../../src/agents/market/market-agent';
import { DexScreenerAgent } from '../../src/agents/dexscreener';

// Mock the specialized agents
jest.mock('../../src/agents/blockchain/blockchain-agent');
jest.mock('../../src/agents/social/social-agent');
jest.mock('../../src/agents/market/market-agent');
jest.mock('../../src/agents/dexscreener');

// Mock environment variables
process.env.GEMINI_API_KEY = 'test_key';

describe('AnalysisAgent', () => {
  let agent: AnalysisAgent;
  let mockBlockchainAgent: jest.Mocked<BlockchainAgent>;
  let mockSocialAgent: jest.Mocked<SocialMediaAgent>;
  let mockMarketAgent: jest.Mocked<MarketAnalysisAgent>;
  let mockDexScreenerAgent: jest.Mocked<DexScreenerAgent>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockBlockchainAgent = new BlockchainAgent() as jest.Mocked<BlockchainAgent>;
    mockSocialAgent = new SocialMediaAgent() as jest.Mocked<SocialMediaAgent>;
    mockMarketAgent = new MarketAnalysisAgent() as jest.Mocked<MarketAnalysisAgent>;
    mockDexScreenerAgent = new DexScreenerAgent() as jest.Mocked<DexScreenerAgent>;
    
    // Create a new agent instance for each test
    agent = new AnalysisAgent();
    
    // Inject mocks into agent
    (agent as any).blockchainAgent = mockBlockchainAgent;
    (agent as any).socialMediaAgent = mockSocialAgent;
    (agent as any).marketAnalysisAgent = mockMarketAgent;
    (agent as any).dexScreenerAgent = mockDexScreenerAgent;
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('Data Collection', () => {
    it('should collect blockchain data', async () => {
      // Mock blockchain agent response
      const mockBlockchainData = {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        riskScore: 35,
        riskLevel: 'Low',
        riskFactors: ['Test risk factor'],
        isVerified: true,
        contractName: 'Test Contract',
        tokenSymbol: 'TEST',
        holderConcentration: {
          topHolderPercentage: 15,
          top10Percentage: 40,
          holderCount: 1000
        }
      };
      
      // Setup the mock
      (mockBlockchainAgent.addCapability as any).mockImplementation((cap) => {
        if (cap.name === 'assessBlockchainRisk') {
          cap.run({ args: { tokenAddress: '0x1234' } }).then(
            result => JSON.stringify(mockBlockchainData)
          );
        }
      });
      
      (agent as any).callCapability = jest.fn().mockResolvedValue(JSON.stringify(mockBlockchainData));
      
      // Call the collectBlockchainData method
      const blockchainData = await (agent as any).collectBlockchainData('0x1234');
      
      // Check the result
      expect(blockchainData).toEqual(mockBlockchainData);
      expect((agent as any).callCapability).toHaveBeenCalledWith(
        expect.any(Object),
        'assessBlockchainRisk',
        { tokenAddress: '0x1234' }
      );
    });

    it('should collect social media data', async () => {
      // Mock social media agent response
      const mockSocialData = {
        projectName: 'Test Project',
        overallSentiment: 'positive',
        positivePercentage: 65,
        negativePercentage: 15,
        neutralPercentage: 20,
        engagementMetrics: {
          totalEngagement: 1000,
          averageLikes: 50,
          averageRetweets: 20
        },
        riskScore: 30,
        riskLevel: 'Low',
        riskFactors: ['Test risk factor']
      };
      
      // Setup the mock
      (agent as any).callCapability = jest.fn().mockResolvedValue(JSON.stringify(mockSocialData));
      
      // Call the collectSocialMediaData method
      const socialData = await (agent as any).collectSocialMediaData('Test Project');
      
      // Check the result
      expect(socialData).toEqual(mockSocialData);
      expect((agent as any).callCapability).toHaveBeenCalledWith(
        expect.any(Object),
        'analyzeSocialSentiment',
        { projectName: 'Test Project' }
      );
    });

    it('should collect market data', async () => {
      // Mock market agent response
      const mockMarketData = {
        coinId: 'test-coin',
        price: 100,
        marketCap: 1000000000,
        volume: 50000000,
        priceChange24h: 5.2,
        priceChange7d: 10.5,
        priceChange30d: -2.3,
        volumeToMarketCapRatio: 0.05,
        volatility: 15,
        riskScore: 40,
        riskLevel: 'Medium',
        riskFactors: ['Test risk factor']
      };
      
      // Setup the mock
      (agent as any).callCapability = jest.fn().mockResolvedValue(JSON.stringify(mockMarketData));
      
      // Call the collectMarketData method
      const marketData = await (agent as any).collectMarketData('test-coin');
      
      // Check the result
      expect(marketData).toEqual(mockMarketData);
      expect((agent as any).callCapability).toHaveBeenCalledWith(
        expect.any(Object),
        'analyzeMarketRisk',
        { coinId: 'test-coin' }
      );
    });

    it('should collect DEX data', async () => {
      // Mock DEX agent response
      const mockDexData = {
        token: 'TEST',
        pairs: [
          {
            dexId: 'uniswap',
            liquidity: { usd: 2000000 },
            volume: { h24: 500000 }
          }
        ],
        riskScore: 25,
        riskLevel: 'Low',
        riskFactors: ['Test risk factor'],
        tradingMetrics: {
          totalLiquidity: 2000000,
          dailyVolume: 500000,
          averagePriceImpact: 1.5
        }
      };
      
      // Setup the mock
      (agent as any).callCapability = jest.fn().mockResolvedValue(JSON.stringify(mockDexData));
      
      // Call the collectDexData method
      const dexData = await (agent as any).collectDexData('TEST');
      
      // Check the result
      expect(dexData).toEqual(mockDexData);
      expect((agent as any).callCapability).toHaveBeenCalledWith(
        expect.any(Object),
        'assessDexRisk',
        { tokenIdentifier: 'TEST' }
      );
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate comprehensive risk score', () => {
      // Test data
      const blockchainScore = 30;
      const socialScore = 20;
      const marketScore = 50;
      const dexScore = 40;
      
      // Define weights for test
      const weights = {
        blockchain: 0.4,
        social: 0.2,
        market: 0.3,
        dex: 0.1
      };
      
      // Store original weights
      const originalWeights = (agent as any).categoryWeights;
      // Override weights for test
      (agent as any).categoryWeights = weights;
      
      // Call the calculateComprehensiveRiskScore method
      const riskScore = (agent as any).calculateComprehensiveRiskScore(
        blockchainScore,
        socialScore,
        marketScore,
        dexScore
      );
      
      // Expected weighted average:
      // (30 * 0.4) + (20 * 0.2) + (50 * 0.3) + (40 * 0.1) = 12 + 4 + 15 + 4 = 35
      expect(riskScore).toBe(35);
      
      // Restore original weights
      (agent as any).categoryWeights = originalWeights;
    });

    it('should determine overall risk level based on score', () => {
      // Test with different risk scores
      expect((agent as any).determineRiskLevel(20)).toBe('Low');
      expect((agent as any).determineRiskLevel(45)).toBe('Medium');
      expect((agent as any).determineRiskLevel(75)).toBe('High');
    });

    it('should calculate breakdown percentages', () => {
      // Test data
      const blockchainScore = 60;
      const socialScore = 30;
      const marketScore = 45;
      const dexScore = 90;
      const comprehensiveScore = 50;
      
      // Call the calculateRiskBreakdown method
      const breakdown = (agent as any).calculateRiskBreakdown(
        blockchainScore,
        socialScore,
        marketScore,
        dexScore,
        comprehensiveScore
      );
      
      // Check the results
      expect(breakdown.blockchain).toBe(60);
      expect(breakdown.social).toBe(30);
      expect(breakdown.market).toBe(45);
      expect(breakdown.dex).toBe(90);
      expect(breakdown.comprehensive).toBe(50);
    });

    it('should generate a complete risk assessment', async () => {
      // Mock data collection methods
      const mockBlockchainData = {
        riskScore: 30,
        riskLevel: 'Low',
        riskFactors: ['Blockchain risk factor']
      };
      
      const mockSocialData = {
        riskScore: 20,
        riskLevel: 'Low',
        riskFactors: ['Social risk factor']
      };
      
      const mockMarketData = {
        riskScore: 50,
        riskLevel: 'Medium',
        riskFactors: ['Market risk factor']
      };
      
      const mockDexData = {
        riskScore: 40,
        riskLevel: 'Medium',
        riskFactors: ['DEX risk factor']
      };
      
      (agent as any).collectBlockchainData = jest.fn().mockResolvedValue(mockBlockchainData);
      (agent as any).collectSocialMediaData = jest.fn().mockResolvedValue(mockSocialData);
      (agent as any).collectMarketData = jest.fn().mockResolvedValue(mockMarketData);
      (agent as any).collectDexData = jest.fn().mockResolvedValue(mockDexData);
      
      // Call the performRiskAssessment method
      const assessment = await (agent as any).performRiskAssessment({
        projectName: 'Test Project',
        tokenAddress: '0x1234',
        coinId: 'test-coin'
      });
      
      // Check the assessment
      expect(assessment).toBeDefined();
      expect(assessment.projectIdentifier).toBe('Test Project');
      expect(assessment.riskScore).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.breakdown).toBeDefined();
      expect(assessment.riskFactors).toBeDefined();
      expect(assessment.riskFactors.blockchain).toContain('Blockchain risk factor');
      expect(assessment.riskFactors.social).toContain('Social risk factor');
      expect(assessment.riskFactors.market).toContain('Market risk factor');
      expect(assessment.riskFactors.dex).toContain('DEX risk factor');
    });
  });
}); 