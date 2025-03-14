import { z } from 'zod';
import axios from 'axios';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces for DEX data
interface TokenPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd?: string;
  priceNative?: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
  };
  txns: {
    h24: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
  };
  fdv?: number;
  marketCap?: number;
}

interface DexRiskAssessment {
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  dex: string;
  priceUsd: string | null;
  liquidity: number;
  volume24h: number;
  marketCap: number | null;
  fdv: number | null;
  buyToSellRatio: number;
  priceChange24h: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  liquidityScore: number;
  liquidityLevel: 'Low' | 'Medium' | 'High';
  redFlags: string[];
  positiveIndicators: string[];
  tokenUrl: string;
}

/**
 * DexScreener Agent
 * Responsible for analyzing DEX data for cryptocurrency projects
 */
export class DexScreenerAgent extends BaseAgent {
  private dexScreenerApiUrl: string = 'https://api.dexscreener.com/latest/dex';
  
  constructor() {
    const systemPrompt = `You are the DexScreener Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to analyze decentralized exchange (DEX) data to evaluate the risk profile of cryptocurrency projects.
You should examine:
1. Liquidity depth and concentration
2. Trading volume and patterns
3. Buy/sell transaction ratios
4. Price impact and slippage concerns
5. DEX-specific risks and anomalies

Provide detailed analysis with specific metrics, observations, and risk ratings.
Use markdown formatting to present data clearly, and include specific evidence for each risk factor identified.`;

    super(systemPrompt, 'DexScreener');
    
    this.addDexScreenerCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement DexScreener-specific logic
   */
  protected async respondToChat(action: z.infer<typeof respondChatMessageActionSchema>): Promise<void> {
    // Get the latest message from the user
    const messages = action.messages;
    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage.author !== 'user') {
      // Only respond to user messages
      return;
    }
    
    const messageText = latestMessage.message;
    
    // Check if the message contains a project name, symbol, or token address
    const tokenIdentifier = this.extractTokenIdentifier(messageText);
    
    if (tokenIdentifier) {
      await this.analyzeDexData(action, tokenIdentifier);
    } else {
      // Default response when no token identifier is found
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'm the DexScreener Agent for CryptoRiskGuard. I can analyze DEX data for cryptocurrency projects, including liquidity, trading volume, and transaction patterns. Please provide a token name, symbol, or address to analyze (e.g., 'Check DEX data for ETH' or 'Analyze 0x...')."
      });
    }
  }
  
  /**
   * Extract token identifier from message
   */
  private extractTokenIdentifier(message: string): string | null {
    // Look for token addresses (0x...)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      return addressMatch[0];
    }
    
    // Look for token names or symbols using common patterns in user requests
    const tokenPatterns = [
      /analyze\s+([a-zA-Z0-9]+)/i,
      /check\s+([a-zA-Z0-9]+)/i,
      /dex\s+data\s+for\s+([a-zA-Z0-9]+)/i,
      /liquidity\s+of\s+([a-zA-Z0-9]+)/i,
      /([a-zA-Z0-9]+)\s+pairs/i,
      /about\s+([a-zA-Z0-9]+)/i
    ];
    
    for (const pattern of tokenPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
  
  /**
   * Analyze DEX data for a token
   */
  private async analyzeDexData(action: z.infer<typeof respondChatMessageActionSchema>, tokenIdentifier: string): Promise<void> {
    try {
      // First, acknowledge that we're analyzing the token
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `🔍 Analyzing DEX data for ${tokenIdentifier}...\n\n1️⃣ Retrieving trading pairs\n2️⃣ Analyzing liquidity and volume\n3️⃣ Evaluating transaction patterns\n4️⃣ Checking for market anomalies\n\nPlease wait while I gather data from decentralized exchanges...`
      });
      
      // Get token pairs from DexScreener
      const pairs = await this.getTokenPairs(tokenIdentifier);
      
      if (!pairs || pairs.length === 0) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `⚠️ I couldn't find any DEX trading pairs for "${tokenIdentifier}". Please check the token name, symbol, or address and try again.`
        });
        return;
      }
      
      // Sort pairs by liquidity (highest first)
      const sortedPairs = [...pairs].sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      
      // Take the most liquid pair for analysis
      const primaryPair = sortedPairs[0];
      
      // Calculate DEX risk assessment
      const assessment = this.calculateDexRiskAssessment(primaryPair, sortedPairs);
      
      // Send the analysis results with rich formatting
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: this.formatDexAnalysisReport(assessment, sortedPairs)
      });
    } catch (error) {
      console.error('Error analyzing DEX data:', error);
      
      // Send error message
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `Error analyzing DEX data for ${tokenIdentifier}. ${error instanceof Error ? error.message : 'Please try again later.'}`
      });
    }
  }
  
  /**
   * Get token pairs from DexScreener API
   */
  private async getTokenPairs(tokenIdentifier: string): Promise<TokenPair[]> {
    try {
      // Determine if this is an address or a symbol/name
      const isAddress = tokenIdentifier.startsWith('0x') && tokenIdentifier.length === 42;
      
      // Construct the appropriate API endpoint
      const endpoint = isAddress 
        ? `${this.dexScreenerApiUrl}/tokens/${tokenIdentifier}`
        : `${this.dexScreenerApiUrl}/search?q=${tokenIdentifier}`;
      
      const response = await axios.get(endpoint);
      
      if (response.data && response.data.pairs) {
        return response.data.pairs;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching token pairs:', error);
      return [];
    }
  }
  
  /**
   * Calculate risk assessment based on DEX data
   */
  private calculateDexRiskAssessment(primaryPair: TokenPair, allPairs: TokenPair[]): DexRiskAssessment {
    // Extract basic info
    const tokenSymbol = primaryPair.baseToken.symbol;
    const tokenName = primaryPair.baseToken.name;
    const chain = primaryPair.chainId;
    const dex = primaryPair.dexId;
    
    // Calculate total liquidity across all pairs
    const totalLiquidity = allPairs.reduce((sum, pair) => sum + (pair.liquidity?.usd || 0), 0);
    
    // Calculate total 24h volume across all pairs
    const totalVolume24h = allPairs.reduce((sum, pair) => sum + (pair.volume?.h24 || 0), 0);
    
    // Calculate buy/sell ratio
    const totalBuys = primaryPair.txns?.h24?.buys || 0;
    const totalSells = primaryPair.txns?.h24?.sells || 0;
    const buyToSellRatio = totalSells > 0 ? totalBuys / totalSells : totalBuys > 0 ? 2 : 1;
    
    // Extract price data
    const priceUsd = primaryPair.priceUsd;
    const priceChange24h = primaryPair.priceChange?.h24 || 0;
    
    // Extract market cap and fully diluted valuation if available
    const marketCap = primaryPair.marketCap || null;
    const fdv = primaryPair.fdv || null;
    
    // Initialize risk factors
    const redFlags: string[] = [];
    const positiveIndicators: string[] = [];
    
    // Assess liquidity
    let liquidityScore = 0;
    let liquidityLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    
    if (totalLiquidity < 10000) {
      liquidityScore = 90;
      liquidityLevel = 'Low';
      redFlags.push('Extremely low liquidity (<$10K) creates high vulnerability to price manipulation');
    } else if (totalLiquidity < 50000) {
      liquidityScore = 70;
      liquidityLevel = 'Low';
      redFlags.push('Very low liquidity (<$50K) suggests high risk of price manipulation');
    } else if (totalLiquidity < 100000) {
      liquidityScore = 60;
      liquidityLevel = 'Low';
      redFlags.push('Low liquidity (<$100K) may lead to high price impact on trades');
    } else if (totalLiquidity < 500000) {
      liquidityScore = 50;
      liquidityLevel = 'Medium';
      redFlags.push('Moderate liquidity (<$500K) means larger trades will have notable price impact');
    } else if (totalLiquidity < 1000000) {
      liquidityScore = 30;
      liquidityLevel = 'Medium';
    } else if (totalLiquidity >= 1000000) {
      liquidityScore = 10;
      liquidityLevel = 'High';
      positiveIndicators.push(`Strong liquidity of $${this.formatNumber(totalLiquidity)} reduces price impact risk`);
    }
    
    // Assess volume
    if (totalVolume24h < 1000) {
      redFlags.push('Extremely low trading volume (<$1K) indicates limited market interest');
    } else if (totalVolume24h < 10000) {
      redFlags.push('Very low trading volume (<$10K) suggests limited market activity');
    } else if (totalVolume24h > 1000000) {
      positiveIndicators.push(`High trading volume of $${this.formatNumber(totalVolume24h)} indicates strong market interest`);
    }
    
    // Assess volume to liquidity ratio
    const volumeToLiquidityRatio = totalLiquidity > 0 ? totalVolume24h / totalLiquidity : 0;
    if (volumeToLiquidityRatio < 0.05) {
      redFlags.push('Very low volume-to-liquidity ratio indicates stagnant trading');
    } else if (volumeToLiquidityRatio > 1) {
      positiveIndicators.push('Healthy volume-to-liquidity ratio indicates active trading');
    }
    
    // Assess buy/sell ratio
    if (buyToSellRatio < 0.5) {
      redFlags.push('Significantly more sells than buys in the last 24 hours');
    } else if (buyToSellRatio > 2) {
      positiveIndicators.push('More buys than sells in the last 24 hours');
    }
    
    // Assess price change
    if (priceChange24h < -20) {
      redFlags.push(`Sharp price decrease of ${priceChange24h.toFixed(2)}% in the last 24 hours`);
    } else if (priceChange24h > 50) {
      redFlags.push(`Suspicious price increase of +${priceChange24h.toFixed(2)}% in the last 24 hours`);
    } else if (priceChange24h > 10 && priceChange24h < 50) {
      positiveIndicators.push(`Positive price movement of +${priceChange24h.toFixed(2)}% in the last 24 hours`);
    }
    
    // Assess number of pairs and DEXes
    const uniqueDexes = new Set(allPairs.map(pair => pair.dexId)).size;
    if (uniqueDexes > 3) {
      positiveIndicators.push(`Listed on ${uniqueDexes} different DEXes, suggesting wider adoption`);
    }
    
    // Calculate overall risk score
    let riskScore = 50; // Start at medium risk
    
    // Liquidity factor
    riskScore += liquidityScore;
    
    // Volume factor
    if (totalVolume24h < 1000) riskScore += 20;
    else if (totalVolume24h < 10000) riskScore += 10;
    else if (totalVolume24h > 1000000) riskScore -= 10;
    
    // Buy/sell ratio factor
    if (buyToSellRatio < 0.5) riskScore += 15;
    else if (buyToSellRatio > 2) riskScore -= 10;
    
    // Price change factor
    if (priceChange24h < -20) riskScore += 10;
    else if (priceChange24h > 50) riskScore += 15;
    
    // Number of DEXes factor
    if (uniqueDexes > 3) riskScore -= 10;
    
    // Ensure score is within bounds
    riskScore = Math.max(0, Math.min(100, riskScore));
    
    // Determine risk level
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    if (riskScore < 40) riskLevel = 'Low';
    else if (riskScore > 70) riskLevel = 'High';
    
    return {
      tokenSymbol,
      tokenName,
      chain,
      dex,
      priceUsd: priceUsd || null,
      liquidity: totalLiquidity,
      volume24h: totalVolume24h,
      marketCap,
      fdv,
      buyToSellRatio,
      priceChange24h,
      riskScore,
      riskLevel,
      liquidityScore,
      liquidityLevel,
      redFlags,
      positiveIndicators,
      tokenUrl: primaryPair.url
    };
  }
  
  /**
   * Format DEX analysis report with rich markdown
   */
  private formatDexAnalysisReport(assessment: DexRiskAssessment, allPairs: TokenPair[]): string {
    // Get risk level badge
    const riskBadge = assessment.riskLevel === 'Low' ? '🟢 **LOW RISK**' : 
                    assessment.riskLevel === 'Medium' ? '🟠 **MEDIUM RISK**' : 
                    '🔴 **HIGH RISK**';
    
    // Format pairs section
    const pairsSection = allPairs.slice(0, 5).map(pair => {
      return `- **${pair.baseToken.symbol}/${pair.quoteToken.symbol}** on ${pair.dexId} (${pair.chainId})
  - Liquidity: $${this.formatNumber(pair.liquidity?.usd || 0)}
  - 24h Volume: $${this.formatNumber(pair.volume?.h24 || 0)}
  - Price: ${pair.priceUsd ? `$${Number(pair.priceUsd).toFixed(pair.priceUsd.includes('e') ? 10 : (Number(pair.priceUsd) < 0.01 ? 10 : 6))}` : 'N/A'}
  - 24h Change: ${pair.priceChange?.h24 ? `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24.toFixed(2)}%` : 'N/A'}`;
    }).join('\n\n');
    
    // Format indicators
    const redFlagsSection = assessment.redFlags.length > 0 ? 
      assessment.redFlags.map(flag => `- ⚠️ ${flag}`).join('\n') : 
      '- ✅ No significant red flags detected';
    
    const positiveIndicatorsSection = assessment.positiveIndicators.length > 0 ? 
      assessment.positiveIndicators.map(indicator => `- ✅ ${indicator}`).join('\n') : 
      '- ❌ No significant positive indicators detected';
    
    // Get liquidity icon
    const liquidityIcon = assessment.liquidityLevel === 'High' ? '💰' : 
                        assessment.liquidityLevel === 'Medium' ? '💵' : '💸';
    
    // Generate recommendations
    const recommendations = this.generateDexRecommendations(assessment);
    
    // Assemble the complete report
    return `# DEX Analysis for ${assessment.tokenName} (${assessment.tokenSymbol})

## Risk Summary
**DEX Risk Score:** ${assessment.riskScore}/100 (${assessment.riskLevel} Risk)
${riskBadge}

## Key DEX Metrics
- **Current Price:** ${assessment.priceUsd ? `$${Number(assessment.priceUsd).toFixed(assessment.priceUsd.includes('e') ? 10 : (Number(assessment.priceUsd) < 0.01 ? 10 : 6))}` : 'N/A'}
- **24h Price Change:** ${assessment.priceChange24h.toFixed(2)}%
- **Market Cap:** ${assessment.marketCap ? `$${this.formatNumber(assessment.marketCap)}` : 'N/A'}
- **Fully Diluted Valuation:** ${assessment.fdv ? `$${this.formatNumber(assessment.fdv)}` : 'N/A'}
- **Primary DEX:** ${assessment.dex} on ${assessment.chain}
- **24h Volume:** $${this.formatNumber(assessment.volume24h)}
- **Buy/Sell Ratio:** ${assessment.buyToSellRatio.toFixed(2)} (${assessment.buyToSellRatio > 1 ? 'more buys than sells' : 'more sells than buys'})

## Liquidity Analysis ${liquidityIcon}
**Liquidity Level:** ${assessment.liquidityLevel}
**Total Liquidity:** $${this.formatNumber(assessment.liquidity)}
*${this.getLiquidityDescription(assessment.liquidityLevel, assessment.liquidity)}*

## Top Trading Pairs
${pairsSection}

## Key Findings

### Risk Factors
${redFlagsSection}

### Positive Indicators
${positiveIndicatorsSection}

## Recommendations
${recommendations}

*This analysis provides DEX trading data only and should be combined with blockchain data, social media sentiment, and team verification for a complete risk assessment.*

[View Token on DexScreener](${assessment.tokenUrl})`;
  }
  
  /**
   * Generate recommendations based on DEX analysis
   */
  private generateDexRecommendations(assessment: DexRiskAssessment): string {
    const recommendations = [];
    
    if (assessment.riskLevel === 'High') {
      recommendations.push('⚠️ **HIGH DEX RISK DETECTED** - Consider this a highly speculative investment with significant potential for loss due to liquidity and trading issues.');
    } else if (assessment.riskLevel === 'Medium') {
      recommendations.push('⚠️ **MODERATE DEX RISK** - Exercise caution and limit position size due to potential liquidity constraints.');
    } else {
      recommendations.push('✅ **FAVORABLE DEX METRICS** - Trading data suggests adequate liquidity and market activity.');
    }
    
    if (assessment.liquidityLevel === 'Low') {
      recommendations.push('⚠️ Use limit orders and small position sizes to minimize price impact and slippage.');
    }
    
    if (assessment.volume24h < 10000 && assessment.liquidity < 100000) {
      recommendations.push('⚠️ Low volume and liquidity combination make this token vulnerable to market manipulation.');
    }
    
    if (assessment.buyToSellRatio < 0.7) {
      recommendations.push('⚠️ Selling pressure exceeds buying pressure, which may indicate a downward price trend.');
    }
    
    if (assessment.redFlags.length > 2) {
      recommendations.push('⚠️ Multiple DEX-related risk factors detected. Consider waiting for trading conditions to improve.');
    }
    
    if (assessment.liquidityLevel === 'High' && assessment.volume24h > 500000) {
      recommendations.push('✅ Strong liquidity and volume provide favorable trading conditions with minimal slippage.');
    }
    
    return recommendations.join('\n');
  }
  
  /**
   * Get description for liquidity level
   */
  private getLiquidityDescription(level: 'Low' | 'Medium' | 'High', liquidity: number): string {
    if (level === 'Low') {
      if (liquidity < 10000) {
        return 'Extremely low liquidity creates high vulnerability to price manipulation and may result in severe slippage';
      } else if (liquidity < 50000) {
        return 'Very low liquidity suggests high risk of price manipulation and significant slippage for trades above $1,000';
      } else {
        return 'Low liquidity may lead to high price impact on trades, particularly for amounts above $5,000';
      }
    } else if (level === 'Medium') {
      return 'Moderate liquidity provides reasonable trading conditions for small to medium-sized trades';
    } else {
      return 'Strong liquidity reduces price impact risk and provides favorable trading conditions';
    }
  }
  
  /**
   * Format numbers with commas for thousands
   */
  private formatNumber(num: number): string {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  
  /**
   * Add DEX-specific capabilities
   */
  private addDexScreenerCapabilities() {
    const self = this; // Store a reference to the class instance
    
    // Add capability to get token pairs
    this.addCapability({
      name: 'getTokenPairs',
      description: 'Get trading pairs for a specific cryptocurrency token',
      schema: z.object({
        tokenIdentifier: z.string().describe('The name, symbol, or address of the crypto token')
      }),
      async run({ args }) {
        try {
          const pairs = await self.getTokenPairs(args.tokenIdentifier);
          
          if (pairs.length === 0) {
            return JSON.stringify({
              error: `No trading pairs found for ${args.tokenIdentifier}`
            });
          }
          
          return JSON.stringify({
            tokenIdentifier: args.tokenIdentifier,
            pairsCount: pairs.length,
            pairs: pairs.slice(0, 10).map(pair => ({
              dex: pair.dexId,
              chain: pair.chainId,
              baseToken: pair.baseToken.symbol,
              quoteToken: pair.quoteToken.symbol,
              price: pair.priceUsd,
              liquidity: pair.liquidity?.usd,
              volume24h: pair.volume?.h24,
              priceChange24h: pair.priceChange?.h24
            }))
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error getting token pairs: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to assess DEX risk
    this.addCapability({
      name: 'assessDexRisk',
      description: 'Assess DEX-related risks for a cryptocurrency token',
      schema: z.object({
        tokenIdentifier: z.string().describe('The name, symbol, or address of the crypto token')
      }),
      async run({ args }) {
        try {
          const pairs = await self.getTokenPairs(args.tokenIdentifier);
          
          if (pairs.length === 0) {
            return JSON.stringify({
              error: `No trading pairs found for ${args.tokenIdentifier}`
            });
          }
          
          // Sort pairs by liquidity (highest first)
          const sortedPairs = [...pairs].sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          
          // Take the most liquid pair for analysis
          const primaryPair = sortedPairs[0];
          
          // Calculate DEX risk assessment
          const assessment = self.calculateDexRiskAssessment(primaryPair, sortedPairs);
          
          return JSON.stringify({
            token: assessment.tokenSymbol,
            name: assessment.tokenName,
            dex_risk_score: assessment.riskScore,
            dex_risk_level: assessment.riskLevel,
            liquidity: assessment.liquidity,
            liquidity_level: assessment.liquidityLevel,
            volume_24h: assessment.volume24h,
            price_change_24h: assessment.priceChange24h,
            red_flags: assessment.redFlags,
            positive_indicators: assessment.positiveIndicators
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error assessing DEX risk: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to filter tokens by criteria
    this.addCapability({
      name: 'filterTokens',
      description: 'Filter tokens by specific DEX criteria',
      schema: z.object({
        chain: z.string().optional().describe('Filter tokens by blockchain (e.g., "ethereum", "bsc")'),
        minVolume24h: z.number().optional().describe('Minimum 24-hour trading volume in USD'),
        minLiquidity: z.number().optional().describe('Minimum liquidity in USD'),
        priceChangeDirection: z.enum(['up', 'down', 'any']).optional().describe('Direction of price change in the last 24 hours')
      }),
      async run({ args }) {
        try {
          // Use the DexScreener top tokens API
          const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/gainers');
          let pairs = response.data.pairs as TokenPair[];
          
          // Filter by chain if specified
          if (args.chain) {
            const chain = args.chain.toLowerCase();
            pairs = pairs.filter(pair => {
              // Map common chain names to DexScreener IDs
              const chainMap: Record<string, string[]> = {
                'ethereum': ['ethereum', 'eth'],
                'bsc': ['bsc', 'bnb'],
                'arbitrum': ['arbitrum', 'arb'],
                'polygon': ['polygon', 'matic'],
                'avalanche': ['avalanche', 'avax']
              };
              
              // Check if the pair's chain matches any of the mapped values
              const chainVariants = chainMap[chain] || [chain];
              return chainVariants.some(variant => pair.chainId.toLowerCase().includes(variant));
            });
          }
          
          // Filter by volume if specified
          if (args.minVolume24h !== undefined) {
            pairs = pairs.filter(pair => (pair.volume?.h24 || 0) >= args.minVolume24h!);
          }
          
          // Filter by liquidity if specified
          if (args.minLiquidity !== undefined) {
            pairs = pairs.filter(pair => (pair.liquidity?.usd || 0) >= args.minLiquidity!);
          }
          
          // Filter by price change direction if specified
          if (args.priceChangeDirection) {
            pairs = pairs.filter(pair => {
              const priceChange = pair.priceChange?.h24 || 0;
              if (args.priceChangeDirection === 'up') return priceChange > 0;
              if (args.priceChangeDirection === 'down') return priceChange < 0;
              return true; // 'any'
            });
          }
          
          // Limit to top 10 results
          const topPairs = pairs.slice(0, 10);
          
          return JSON.stringify({
            count: topPairs.length,
            tokens: topPairs.map(pair => ({
              name: pair.baseToken.name,
              symbol: pair.baseToken.symbol,
              chain: pair.chainId,
              dex: pair.dexId,
              price: pair.priceUsd,
              priceChange24h: pair.priceChange?.h24,
              liquidity: pair.liquidity?.usd,
              volume24h: pair.volume?.h24,
              url: pair.url
            }))
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error filtering tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
  }
} 