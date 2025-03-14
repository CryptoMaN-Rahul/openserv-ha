import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CoordinatorAgent } from '../../src/agents/coordinator/coordinator-agent';
import { BlockchainAgent } from '../../src/agents/blockchain/blockchain-agent';
import { SocialMediaAgent } from '../../src/agents/social/social-agent';
import { MarketAnalysisAgent } from '../../src/agents/market/market-agent';
import { DexScreenerAgent } from '../../src/agents/dexscreener';
import { AnalysisAgent } from '../../src/agents/analysis';
import { ReportingAgent } from '../../src/agents/reporting';

// Mock the specialized agents
jest.mock('../../src/agents/blockchain/blockchain-agent');
jest.mock('../../src/agents/social/social-agent');
jest.mock('../../src/agents/market/market-agent');
jest.mock('../../src/agents/dexscreener');
jest.mock('../../src/agents/analysis');
jest.mock('../../src/agents/reporting');

// Mock environment variables
process.env.GEMINI_API_KEY = 'test_key';

describe('CoordinatorAgent', () => {
  let agent: CoordinatorAgent;
  let mockBlockchainAgent: jest.Mocked<BlockchainAgent>;
  let mockSocialAgent: jest.Mocked<SocialMediaAgent>;
  let mockMarketAgent: jest.Mocked<MarketAnalysisAgent>;
  let mockDexScreenerAgent: jest.Mocked<DexScreenerAgent>;
  let mockAnalysisAgent: jest.Mocked<AnalysisAgent>;
  let mockReportingAgent: jest.Mocked<ReportingAgent>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockBlockchainAgent = new BlockchainAgent() as jest.Mocked<BlockchainAgent>;
    mockSocialAgent = new SocialMediaAgent() as jest.Mocked<SocialMediaAgent>;
    mockMarketAgent = new MarketAnalysisAgent() as jest.Mocked<MarketAnalysisAgent>;
    mockDexScreenerAgent = new DexScreenerAgent() as jest.Mocked<DexScreenerAgent>;
    mockAnalysisAgent = new AnalysisAgent() as jest.Mocked<AnalysisAgent>;
    mockReportingAgent = new ReportingAgent() as jest.Mocked<ReportingAgent>;
    
    // Create a new agent instance for each test
    agent = new CoordinatorAgent();
    
    // Inject mocks into agent
    (agent as any).blockchainAgent = mockBlockchainAgent;
    (agent as any).socialMediaAgent = mockSocialAgent;
    (agent as any).marketAnalysisAgent = mockMarketAgent;
    (agent as any).dexScreenerAgent = mockDexScreenerAgent;
    (agent as any).analysisAgent = mockAnalysisAgent;
    (agent as any).reportingAgent = mockReportingAgent;
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('Request Routing', () => {
    it('should analyze message intent to determine appropriate agent', () => {
      // Test with various messages
      expect((agent as any).analyzeMessageIntent('Analyze the blockchain risk of token 0x1234')).toBe('blockchain');
      expect((agent as any).analyzeMessageIntent('What is the sentiment for Bitcoin on Twitter?')).toBe('social');
      expect((agent as any).analyzeMessageIntent('Check the market data for Ethereum')).toBe('market');
      expect((agent as any).analyzeMessageIntent('Analyze DEX metrics for SHIB token')).toBe('dex');
      expect((agent as any).analyzeMessageIntent('Perform a complete risk assessment for DOT')).toBe('analysis');
      expect((agent as any).analyzeMessageIntent('Generate a risk report for Cardano')).toBe('reporting');
      expect((agent as any).analyzeMessageIntent('Hello, what can you do?')).toBe('general');
    });

    it('should extract project identifiers from user messages', () => {
      // Test with different message formats
      const result1 = (agent as any).extractProjectIdentifiers('Analyze Ethereum (ETH) risk');
      expect(result1.projectName).toBe('Ethereum');
      expect(result1.tokenSymbol).toBe('ETH');
      
      const result2 = (agent as any).extractProjectIdentifiers('Check token address 0x1234567890123456789012345678901234567890');
      expect(result2.tokenAddress).toBe('0x1234567890123456789012345678901234567890');
      
      const result3 = (agent as any).extractProjectIdentifiers('What about bitcoin?');
      expect(result3.projectName).toBe('bitcoin');
    });

    it('should route blockchain requests to the Blockchain Agent', async () => {
      // Setup mock response
      const mockResponse = { mock: 'blockchain response' };
      mockBlockchainAgent.process = jest.fn().mockResolvedValue(mockResponse);
      
      // Call the routeToBlockchainAgent method
      const result = await (agent as any).routeToBlockchainAgent({
        messages: [{ role: 'user', content: 'Analyze token 0x1234' }]
      });
      
      // Check routing
      expect(result).toBe(mockResponse);
      expect(mockBlockchainAgent.process).toHaveBeenCalledWith(expect.anything());
    });

    it('should route social media requests to the Social Media Agent', async () => {
      // Setup mock response
      const mockResponse = { mock: 'social response' };
      mockSocialAgent.process = jest.fn().mockResolvedValue(mockResponse);
      
      // Call the routeToSocialMediaAgent method
      const result = await (agent as any).routeToSocialMediaAgent({
        messages: [{ role: 'user', content: 'Check Twitter sentiment for Bitcoin' }]
      });
      
      // Check routing
      expect(result).toBe(mockResponse);
      expect(mockSocialAgent.process).toHaveBeenCalledWith(expect.anything());
    });

    it('should route market requests to the Market Analysis Agent', async () => {
      // Setup mock response
      const mockResponse = { mock: 'market response' };
      mockMarketAgent.process = jest.fn().mockResolvedValue(mockResponse);
      
      // Call the routeToMarketAnalysisAgent method
      const result = await (agent as any).routeToMarketAnalysisAgent({
        messages: [{ role: 'user', content: 'Check price data for Ethereum' }]
      });
      
      // Check routing
      expect(result).toBe(mockResponse);
      expect(mockMarketAgent.process).toHaveBeenCalledWith(expect.anything());
    });

    it('should route DEX requests to the DexScreener Agent', async () => {
      // Setup mock response
      const mockResponse = { mock: 'dex response' };
      mockDexScreenerAgent.process = jest.fn().mockResolvedValue(mockResponse);
      
      // Call the routeToDexScreenerAgent method
      const result = await (agent as any).routeToDexScreenerAgent({
        messages: [{ role: 'user', content: 'Check DEX liquidity for SHIB' }]
      });
      
      // Check routing
      expect(result).toBe(mockResponse);
      expect(mockDexScreenerAgent.process).toHaveBeenCalledWith(expect.anything());
    });

    it('should route analysis requests to the Analysis Agent', async () => {
      // Setup mock response
      const mockResponse = { mock: 'analysis response' };
      mockAnalysisAgent.process = jest.fn().mockResolvedValue(mockResponse);
      
      // Call the routeToAnalysisAgent method
      const result = await (agent as any).routeToAnalysisAgent({
        messages: [{ role: 'user', content: 'Do a full risk assessment for Bitcoin' }]
      });
      
      // Check routing
      expect(result).toBe(mockResponse);
      expect(mockAnalysisAgent.process).toHaveBeenCalledWith(expect.anything());
    });

    it('should route reporting requests to the Reporting Agent', async () => {
      // Setup mock response
      const mockResponse = { mock: 'reporting response' };
      mockReportingAgent.process = jest.fn().mockResolvedValue(mockResponse);
      
      // Call the routeToReportingAgent method
      const result = await (agent as any).routeToReportingAgent({
        messages: [{ role: 'user', content: 'Generate a report for Ethereum' }]
      });
      
      // Check routing
      expect(result).toBe(mockResponse);
      expect(mockReportingAgent.process).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('Chat Response', () => {
    it('should handle general inquiries with helpful information', async () => {
      // Setup mocks for sending chat messages
      (agent as any).sendChatMessage = jest.fn();
      
      // Call respondToChat with a general inquiry
      await (agent as any).respondToChat({
        messages: [{ author: 'user', message: 'What can you do?' }],
        workspace: { id: 'test-workspace' },
        me: { id: 'test-agent' }
      });
      
      // Check that sendChatMessage was called with helpful information
      expect((agent as any).sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('I am the Coordinator Agent for CryptoRiskGuard')
      }));
    });

    it('should route token address requests to the Blockchain Agent', async () => {
      // Setup mocks
      (agent as any).analyzeMessageIntent = jest.fn().mockReturnValue('blockchain');
      (agent as any).routeToBlockchainAgent = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Blockchain analysis result' } }]
      });
      (agent as any).sendChatMessage = jest.fn();
      
      // Call respondToChat with a blockchain request
      await (agent as any).respondToChat({
        messages: [{ author: 'user', message: 'Analyze token 0x1234' }],
        workspace: { id: 'test-workspace' },
        me: { id: 'test-agent' }
      });
      
      // Check that the blockchain agent was called and result was sent
      expect((agent as any).analyzeMessageIntent).toHaveBeenCalled();
      expect((agent as any).routeToBlockchainAgent).toHaveBeenCalled();
      expect((agent as any).sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Blockchain analysis result'
      }));
    });

    it('should handle errors gracefully', async () => {
      // Setup mock to throw an error
      (agent as any).analyzeMessageIntent = jest.fn().mockReturnValue('blockchain');
      (agent as any).routeToBlockchainAgent = jest.fn().mockRejectedValue(new Error('Test error'));
      (agent as any).sendChatMessage = jest.fn();
      
      // Call respondToChat and expect error handling
      await (agent as any).respondToChat({
        messages: [{ author: 'user', message: 'Analyze token 0x1234' }],
        workspace: { id: 'test-workspace' },
        me: { id: 'test-agent' }
      });
      
      // Check that error message was sent
      expect((agent as any).sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('error occurred')
      }));
    });
  });

  describe('Mapping Functions', () => {
    it('should map common crypto names to standardized identifiers', () => {
      // Test mapping function
      expect((agent as any).mapCryptoNameToCoinId('BTC')).toBe('bitcoin');
      expect((agent as any).mapCryptoNameToCoinId('ETH')).toBe('ethereum');
      expect((agent as any).mapCryptoNameToCoinId('DOGE')).toBe('dogecoin');
      expect((agent as any).mapCryptoNameToCoinId('XRP')).toBe('ripple');
      
      // Test case insensitivity
      expect((agent as any).mapCryptoNameToCoinId('bitcoin')).toBe('bitcoin');
      expect((agent as any).mapCryptoNameToCoinId('Bitcoin')).toBe('bitcoin');
      expect((agent as any).mapCryptoNameToCoinId('BITCOIN')).toBe('bitcoin');
      
      // Test unmapped values
      expect((agent as any).mapCryptoNameToCoinId('UNKNOWN_TOKEN')).toBe('UNKNOWN_TOKEN');
    });
  });
}); 