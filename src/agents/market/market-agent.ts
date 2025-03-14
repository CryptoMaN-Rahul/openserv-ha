import { z } from 'zod';
import axios from 'axios';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces for market data
interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

interface MarketMetric {
  name: string;
  value: string | number;
  status: 'positive' | 'neutral' | 'negative';
  description: string;
}

interface PriceTrend {
  timeframe: string;
  change: number;
  changePercent: number;
  volatility: number;
  status: 'uptrend' | 'downtrend' | 'sideways';
}

interface MarketRiskAssessment {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  redFlags: string[];
  positiveIndicators: string[];
  metrics: MarketMetric[];
  priceTrends: PriceTrend[];
  liquidity: {
    score: number;
    level: 'Low' | 'Medium' | 'High';
    description: string;
  };
  volatility: {
    score: number;
    level: 'Low' | 'Medium' | 'High';
    description: string;
  };
  lastUpdated: string;
}

/**
 * Market Analysis Agent
 * Responsible for analyzing market data and price trends for cryptocurrency projects
 */
export class MarketAnalysisAgent extends BaseAgent {
  private coinGeckoApiUrl: string = 'https://api.coingecko.com/api/v3';
  private coinGeckoApiKey: string;
  
  constructor() {
    const systemPrompt = `You are the Market Analysis Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to analyze market data and trading patterns to evaluate the risk profile of cryptocurrency projects.
You should examine:
1. Price trends and volatility
2. Market capitalization and rank
3. Trading volume and liquidity
4. Historical price performance
5. Market anomalies and manipulation signals

Provide detailed analysis with specific metrics, observations, and risk ratings.
Use markdown formatting to present data clearly, and include specific evidence for each risk factor identified.`;

    super(systemPrompt, 'Market Analysis');
    
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY || '';
    
    if (!this.coinGeckoApiKey) {
      console.warn('COINGECKO_API_KEY is not set in .env file. Free tier with rate limits will be used.');
    }
    
    this.addMarketCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement market analysis-specific logic
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
    
    // Check if the message contains a project name or token symbol
    const projectMatch = this.extractProjectIdentifier(messageText);
    
    if (projectMatch) {
      await this.analyzeMarketData(action, projectMatch);
    } else {
      // Default response when no project identifier is found
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'm the Market Analysis Agent for CryptoRiskGuard. I can analyze market data, price trends, and trading patterns for cryptocurrency projects. Please provide a project name or token symbol to analyze (e.g., 'Check market data for Bitcoin' or 'Analyze BTC')."
      });
    }
  }
  
  /**
   * Extract project identifier from message
   */
  private extractProjectIdentifier(message: string): string | null {
    // Look for token addresses (0x...)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      return addressMatch[0];
    }
    
    // Look for project names or symbols using common patterns in user requests
    const projectPatterns = [
      /analyze\s+([a-zA-Z0-9]+)/i,
      /check\s+([a-zA-Z0-9]+)/i,
      /market\s+data\s+for\s+([a-zA-Z0-9]+)/i,
      /price\s+of\s+([a-zA-Z0-9]+)/i,
      /([a-zA-Z0-9]+)\s+price/i,
      /about\s+([a-zA-Z0-9]+)/i
    ];
    
    for (const pattern of projectPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
  
  /**
   * Analyze market data for a project
   */
  private async analyzeMarketData(action: z.infer<typeof respondChatMessageActionSchema>, projectIdentifier: string): Promise<void> {
    try {
      // First, acknowledge that we're analyzing the project
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `🔍 Analyzing market data for ${projectIdentifier}...\n\n1️⃣ Retrieving current price and market cap\n2️⃣ Analyzing price trends and volatility\n3️⃣ Evaluating trading volume and liquidity\n4️⃣ Checking for market anomalies\n\nPlease wait while I gather and analyze market data...`
      });
      
      // Get coin ID from project identifier
      const coinId = await this.getCoinId(projectIdentifier);
      
      if (!coinId) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `⚠️ I couldn't find market data for "${projectIdentifier}". Please check the project name or token symbol and try again.`
        });
        return;
      }
      
      // Get market data
      const coinData = await this.getCoinMarketData(coinId);
      
      if (!coinData) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `⚠️ Unable to retrieve market data for ${projectIdentifier}. The API may be experiencing issues or rate limits. Please try again later.`
        });
        return;
      }
      
      // Get historical price data
      const priceHistory = await this.getPriceHistory(coinId);
      
      // Analyze the market data
      const assessment = this.calculateMarketRiskAssessment(coinData, priceHistory);
      
      // Send the analysis results with rich formatting
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: this.formatMarketAnalysisReport(assessment)
      });
    } catch (error) {
      console.error('Error analyzing market data:', error);
      
      // Send error message
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `Error analyzing market data for ${projectIdentifier}. ${error instanceof Error ? error.message : 'Please try again later.'}`
      });
    }
  }
  
  /**
   * Get coin ID from project identifier (name, symbol, or address)
   */
  private async getCoinId(projectIdentifier: string): Promise<string | null> {
    try {
      // Handle common cryptocurrencies directly
      const commonCoins: Record<string, string> = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'usdt': 'tether',
        'usdc': 'usd-coin',
        'bnb': 'binancecoin',
        'xrp': 'ripple',
        'sol': 'solana',
        'ada': 'cardano',
        'doge': 'dogecoin',
        'avax': 'avalanche-2',
        'dot': 'polkadot',
        'link': 'chainlink',
        'matic': 'matic-network',
        'shib': 'shiba-inu',
        'ltc': 'litecoin',
        'uni': 'uniswap',
        'atom': 'cosmos',
        'near': 'near',
        'etc': 'ethereum-classic',
        'xlm': 'stellar'
      };
      
      // Check if it's a common coin
      if (commonCoins[projectIdentifier.toLowerCase()]) {
        return commonCoins[projectIdentifier.toLowerCase()];
      }
      
      // Otherwise, search the CoinGecko API
      const searchUrl = `${this.coinGeckoApiUrl}/search`;
      const response = await axios.get(searchUrl, {
        params: {
          query: projectIdentifier
        },
        headers: this.coinGeckoApiKey ? { 'x-cg-api-key': this.coinGeckoApiKey } : {}
      });
      
      if (response.data && response.data.coins && response.data.coins.length > 0) {
        // Return the first coin ID
        return response.data.coins[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting coin ID:', error);
      return null;
    }
  }
  
  /**
   * Get market data for a coin
   */
  private async getCoinMarketData(coinId: string): Promise<CoinData | null> {
    try {
      const marketsUrl = `${this.coinGeckoApiUrl}/coins/markets`;
      const response = await axios.get(marketsUrl, {
        params: {
          vs_currency: 'usd',
          ids: coinId,
          order: 'market_cap_desc',
          per_page: 1,
          page: 1,
          sparkline: false,
          price_change_percentage: '1h,24h,7d'
        },
        headers: this.coinGeckoApiKey ? { 'x-cg-api-key': this.coinGeckoApiKey } : {}
      });
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting market data:', error);
      return null;
    }
  }
  
  /**
   * Get historical price data for a coin
   */
  private async getPriceHistory(coinId: string): Promise<Record<string, Array<[number, number]>> | null> {
    try {
      const marketChartUrl = `${this.coinGeckoApiUrl}/coins/${coinId}/market_chart`;
      const response = await axios.get(marketChartUrl, {
        params: {
          vs_currency: 'usd',
          days: 30,
          interval: 'daily'
        },
        headers: this.coinGeckoApiKey ? { 'x-cg-api-key': this.coinGeckoApiKey } : {}
      });
      
      if (response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting price history:', error);
      return null;
    }
  }
  
  /**
   * Calculate risk assessment based on market data
   */
  private calculateMarketRiskAssessment(
    coinData: CoinData,
    priceHistory: Record<string, Array<[number, number]>> | null
  ): MarketRiskAssessment {
    // Calculate volatility from price history
    let volatilityScore = 0;
    let volatilityLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    let volatilityDescription = 'Price volatility could not be calculated due to insufficient historical data.';
    
    if (priceHistory && priceHistory.prices && priceHistory.prices.length > 1) {
      const prices = priceHistory.prices.map(p => p[1]);
      volatilityScore = this.calculatePriceVolatility(prices);
      
      if (volatilityScore < 0.03) {
        volatilityLevel = 'Low';
        volatilityDescription = 'Price shows low volatility, suggesting stability but potentially limited growth opportunities.';
      } else if (volatilityScore > 0.08) {
        volatilityLevel = 'High';
        volatilityDescription = 'Price shows high volatility, indicating potential for large price swings and increased risk.';
      } else {
        volatilityDescription = 'Price shows moderate volatility, balancing potential growth with acceptable risk levels.';
      }
    }
    
    // Calculate liquidity score based on volume to market cap ratio
    const volumeToMarketCapRatio = coinData.total_volume / coinData.market_cap;
    let liquidityScore = volumeToMarketCapRatio * 100; // Scale to percentage
    let liquidityLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    let liquidityDescription = 'Average liquidity compared to market capitalization.';
    
    if (liquidityScore < 3) {
      liquidityLevel = 'Low';
      liquidityDescription = 'Low trading volume relative to market cap, indicating potential liquidity risk.';
    } else if (liquidityScore > 15) {
      liquidityLevel = 'High';
      liquidityDescription = 'High trading volume relative to market cap, suggesting good liquidity.';
    }
    
    // Calculate price trends
    const priceTrends: PriceTrend[] = [];
    
    // 24-hour trend
    priceTrends.push({
      timeframe: '24 hours',
      change: coinData.price_change_24h,
      changePercent: coinData.price_change_percentage_24h,
      volatility: Math.abs(coinData.price_change_percentage_24h) / 24, // Hourly volatility
      status: coinData.price_change_percentage_24h > 0 ? 'uptrend' : (coinData.price_change_percentage_24h < 0 ? 'downtrend' : 'sideways')
    });
    
    // Calculate metrics
    const metrics: MarketMetric[] = [
      {
        name: 'Market Cap',
        value: this.formatCurrency(coinData.market_cap),
        status: coinData.market_cap > 1000000000 ? 'positive' : (coinData.market_cap < 10000000 ? 'negative' : 'neutral'),
        description: coinData.market_cap > 1000000000 ? 'Large market cap indicates established project' : 
                    (coinData.market_cap < 10000000 ? 'Small market cap suggests higher risk' : 'Moderate market cap')
      },
      {
        name: 'Market Cap Rank',
        value: coinData.market_cap_rank,
        status: coinData.market_cap_rank <= 100 ? 'positive' : (coinData.market_cap_rank > 500 ? 'negative' : 'neutral'),
        description: coinData.market_cap_rank <= 100 ? 'Top 100 cryptocurrency by market cap' : 
                    (coinData.market_cap_rank > 500 ? 'Lower ranked cryptocurrency' : 'Mid-tier cryptocurrency')
      },
      {
        name: '24h Trading Volume',
        value: this.formatCurrency(coinData.total_volume),
        status: volumeToMarketCapRatio > 0.1 ? 'positive' : (volumeToMarketCapRatio < 0.03 ? 'negative' : 'neutral'),
        description: volumeToMarketCapRatio > 0.1 ? 'High trading volume relative to market cap' : 
                    (volumeToMarketCapRatio < 0.03 ? 'Low trading volume may indicate liquidity issues' : 'Average trading volume')
      },
      {
        name: '24h Price Change',
        value: `${coinData.price_change_percentage_24h.toFixed(2)}%`,
        status: coinData.price_change_percentage_24h > 2 ? 'positive' : 
               (coinData.price_change_percentage_24h < -2 ? 'negative' : 'neutral'),
        description: coinData.price_change_percentage_24h > 10 ? 'Significant price increase in last 24 hours' :
                    (coinData.price_change_percentage_24h < -10 ? 'Significant price decrease in last 24 hours' : 
                    'Moderate price change in last 24 hours')
      },
      {
        name: 'All-Time High Distance',
        value: `${coinData.ath_change_percentage.toFixed(2)}%`,
        status: coinData.ath_change_percentage > -30 ? 'positive' : 
               (coinData.ath_change_percentage < -80 ? 'negative' : 'neutral'),
        description: coinData.ath_change_percentage > -30 ? 'Near all-time high' :
                    (coinData.ath_change_percentage < -80 ? 'Far from all-time high' : 'Moderate distance from all-time high')
      },
      {
        name: 'Circulating/Total Supply',
        value: coinData.total_supply ? `${((coinData.circulating_supply / coinData.total_supply) * 100).toFixed(2)}%` : 'N/A',
        status: coinData.total_supply && (coinData.circulating_supply / coinData.total_supply > 0.7) ? 'positive' : 
               (coinData.total_supply && (coinData.circulating_supply / coinData.total_supply < 0.3) ? 'negative' : 'neutral'),
        description: coinData.total_supply && (coinData.circulating_supply / coinData.total_supply > 0.7) ? 'Most of supply is in circulation' :
                    (coinData.total_supply && (coinData.circulating_supply / coinData.total_supply < 0.3) ? 'Small portion of supply in circulation' : 
                    'Moderate portion of supply in circulation')
      }
    ];
    
    // Identify red flags and positive indicators
    const redFlags: string[] = [];
    const positiveIndicators: string[] = [];
    
    // Check for low market cap
    if (coinData.market_cap < 5000000) {
      redFlags.push('Very low market capitalization (<$5M) indicates higher risk');
    }
    
    // Check for low liquidity
    if (volumeToMarketCapRatio < 0.02) {
      redFlags.push('Low trading volume relative to market cap may cause price slippage');
    }
    
    // Check for high volatility
    if (volatilityScore > 0.1) {
      redFlags.push('Extremely high price volatility');
    }
    
    // Check for low rank
    if (coinData.market_cap_rank > 1000) {
      redFlags.push('Very low market cap ranking');
    }
    
    // Check for large drop from ATH
    if (coinData.ath_change_percentage < -90) {
      redFlags.push('Price is down over 90% from all-time high');
    }
    
    // Positive indicators
    if (coinData.market_cap > 1000000000) {
      positiveIndicators.push('Large market capitalization (>$1B) suggests established project');
    }
    
    if (coinData.market_cap_rank <= 50) {
      positiveIndicators.push('Top 50 cryptocurrency by market cap');
    }
    
    if (volumeToMarketCapRatio > 0.15) {
      positiveIndicators.push('High trading volume indicates strong market interest');
    }
    
    if (volatilityScore < 0.02) {
      positiveIndicators.push('Low price volatility suggests price stability');
    }
    
    // Calculate overall risk score (0-100, higher = riskier)
    let riskScore = 50; // Start at medium risk
    
    // Market cap factor (lower = higher risk)
    if (coinData.market_cap > 10000000000) riskScore -= 15;
    else if (coinData.market_cap > 1000000000) riskScore -= 10;
    else if (coinData.market_cap < 10000000) riskScore += 15;
    else if (coinData.market_cap < 100000000) riskScore += 5;
    
    // Rank factor
    if (coinData.market_cap_rank <= 10) riskScore -= 15;
    else if (coinData.market_cap_rank <= 50) riskScore -= 10;
    else if (coinData.market_cap_rank <= 100) riskScore -= 5;
    else if (coinData.market_cap_rank > 500) riskScore += 10;
    else if (coinData.market_cap_rank > 1000) riskScore += 15;
    
    // Liquidity factor
    if (volumeToMarketCapRatio > 0.2) riskScore -= 10;
    else if (volumeToMarketCapRatio > 0.1) riskScore -= 5;
    else if (volumeToMarketCapRatio < 0.02) riskScore += 15;
    else if (volumeToMarketCapRatio < 0.05) riskScore += 5;
    
    // Volatility factor
    if (volatilityScore > 0.1) riskScore += 15;
    else if (volatilityScore > 0.05) riskScore += 5;
    else if (volatilityScore < 0.02) riskScore -= 5;
    
    // ATH distance factor
    if (coinData.ath_change_percentage > -20) riskScore -= 5;
    else if (coinData.ath_change_percentage < -80) riskScore += 5;
    
    // Ensure score is within bounds
    riskScore = Math.max(0, Math.min(100, riskScore));
    
    // Determine risk level
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    if (riskScore < 40) riskLevel = 'Low';
    else if (riskScore > 70) riskLevel = 'High';
    
    return {
      symbol: coinData.symbol.toUpperCase(),
      name: coinData.name,
      currentPrice: coinData.current_price,
      marketCap: coinData.market_cap,
      marketCapRank: coinData.market_cap_rank,
      riskScore,
      riskLevel,
      redFlags,
      positiveIndicators,
      metrics,
      priceTrends,
      liquidity: {
        score: liquidityScore,
        level: liquidityLevel,
        description: liquidityDescription
      },
      volatility: {
        score: volatilityScore * 100, // Convert to percentage for display
        level: volatilityLevel,
        description: volatilityDescription
      },
      lastUpdated: coinData.last_updated
    };
  }
  
  /**
   * Calculate price volatility using standard deviation of daily returns
   */
  private calculatePriceVolatility(prices: number[]): number {
    if (prices.length < 2) {
      return 0;
    }
    
    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    // Calculate mean of returns
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    
    // Calculate variance
    const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length;
    
    // Return standard deviation
    return Math.sqrt(variance);
  }
  
  /**
   * Format currency values for display
   */
  private formatCurrency(value: number): string {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }
  
  /**
   * Format market analysis report with rich markdown
   */
  private formatMarketAnalysisReport(assessment: MarketRiskAssessment): string {
    // Get risk level badge
    const riskBadge = assessment.riskLevel === 'Low' ? '🟢 **LOW RISK**' : 
                    assessment.riskLevel === 'Medium' ? '🟠 **MEDIUM RISK**' : 
                    '🔴 **HIGH RISK**';
    
    // Format metrics section
    const metricsSection = assessment.metrics.map(metric => {
      const icon = metric.status === 'positive' ? '✅' : 
                 metric.status === 'neutral' ? '⚠️' : '❌';
      return `- **${metric.name}:** ${metric.value} ${icon}\n  *${metric.description}*`;
    }).join('\n');
    
    // Format price trends section
    const trendSection = assessment.priceTrends.map(trend => {
      const icon = trend.status === 'uptrend' ? '📈' : 
                 trend.status === 'downtrend' ? '📉' : '➡️';
      const changePrefix = trend.change >= 0 ? '+' : '';
      return `- **${trend.timeframe}:** ${icon} ${changePrefix}${trend.change.toFixed(6)} USD (${changePrefix}${trend.changePercent.toFixed(2)}%)`;
    }).join('\n');
    
    // Format indicators
    const redFlagsSection = assessment.redFlags.length > 0 ? 
      assessment.redFlags.map(flag => `- ⚠️ ${flag}`).join('\n') : 
      '- ✅ No significant red flags detected';
    
    const positiveIndicatorsSection = assessment.positiveIndicators.length > 0 ? 
      assessment.positiveIndicators.map(indicator => `- ✅ ${indicator}`).join('\n') : 
      '- ❌ No significant positive indicators detected';
    
    // Get liquidity icon
    const liquidityIcon = assessment.liquidity.level === 'High' ? '💰' : 
                        assessment.liquidity.level === 'Medium' ? '💵' : '💸';
    
    // Get volatility icon
    const volatilityIcon = assessment.volatility.level === 'Low' ? '📊' : 
                         assessment.volatility.level === 'Medium' ? '📈' : '🎢';
    
    // Generate recommendations
    const recommendations = this.generateMarketRecommendations(assessment);
    
    // Assemble the complete report
    return `# Market Analysis for ${assessment.name} (${assessment.symbol})

## Risk Summary
**Market Risk Score:** ${assessment.riskScore}/100 (${assessment.riskLevel} Risk)
${riskBadge}

## Current Market Data
- **Current Price:** $${assessment.currentPrice.toFixed(6)} USD
- **Market Cap:** ${this.formatCurrency(assessment.marketCap)}
- **Market Cap Rank:** #${assessment.marketCapRank}
- **Last Updated:** ${new Date(assessment.lastUpdated).toLocaleString()}

## Key Market Metrics
${metricsSection}

## Price Trends
${trendSection}

## Liquidity Analysis ${liquidityIcon}
**Liquidity Level:** ${assessment.liquidity.level}
**Liquidity Score:** ${assessment.liquidity.score.toFixed(2)}%
*${assessment.liquidity.description}*

## Volatility Analysis ${volatilityIcon}
**Volatility Level:** ${assessment.volatility.level}
**Volatility Score:** ${assessment.volatility.score.toFixed(2)}%
*${assessment.volatility.description}*

## Key Findings

### Risk Factors
${redFlagsSection}

### Positive Indicators
${positiveIndicatorsSection}

## Recommendations
${recommendations}

*This analysis provides market data only and should be combined with blockchain data, team verification, and social media sentiment for a complete risk assessment.*`;
  }
  
  /**
   * Generate recommendations based on market analysis
   */
  private generateMarketRecommendations(assessment: MarketRiskAssessment): string {
    const recommendations = [];
    
    if (assessment.riskLevel === 'High') {
      recommendations.push('⚠️ **HIGH MARKET RISK DETECTED** - Consider this a highly speculative investment with significant potential for loss.');
    } else if (assessment.riskLevel === 'Medium') {
      recommendations.push('⚠️ **MODERATE MARKET RISK** - Exercise caution and consider diversifying your exposure.');
    } else {
      recommendations.push('✅ **FAVORABLE MARKET METRICS** - Market indicators suggest lower risk compared to many crypto assets.');
    }
    
    if (assessment.marketCap < 100000000 && assessment.volatility.level === 'High') {
      recommendations.push('⚠️ Small market capitalization combined with high volatility suggests potential for significant price swings.');
    }
    
    if (assessment.liquidity.level === 'Low') {
      recommendations.push('⚠️ Low liquidity may cause significant slippage when trading. Consider smaller position sizes or limit orders.');
    }
    
    if (assessment.marketCapRank > 500) {
      recommendations.push('⚠️ Lower market cap ranking typically indicates higher risk. Consider allocating a smaller portion of your portfolio.');
    }
    
    if (assessment.redFlags.length > 2) {
      recommendations.push('⚠️ Multiple market risk factors detected. Consider waiting for market conditions to improve before investing.');
    }
    
    if (assessment.redFlags.length === 0 && assessment.positiveIndicators.length > 2) {
      recommendations.push('✅ Multiple positive market indicators suggest favorable risk/reward profile compared to similar assets.');
    }
    
    return recommendations.join('\n');
  }
  
  /**
   * Add market analysis-specific capabilities
   */
  private addMarketCapabilities() {
    const self = this; // Store a reference to the class instance
    
    // Add capability to get market data for a specific project
    this.addCapability({
      name: 'getMarketData',
      description: 'Get market data for a specific cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or symbol of the crypto project')
      }),
      async run({ args }) {
        try {
          const coinId = await self.getCoinId(args.projectIdentifier);
          
          if (!coinId) {
            return JSON.stringify({
              error: `Could not find cryptocurrency with identifier: ${args.projectIdentifier}`
            });
          }
          
          const marketData = await self.getCoinMarketData(coinId);
          
          if (!marketData) {
            return JSON.stringify({
              error: `Could not retrieve market data for: ${args.projectIdentifier}`
            });
          }
          
          return JSON.stringify({
            id: marketData.id,
            name: marketData.name,
            symbol: marketData.symbol,
            current_price: marketData.current_price,
            market_cap: marketData.market_cap,
            market_cap_rank: marketData.market_cap_rank,
            total_volume: marketData.total_volume,
            price_change_24h: marketData.price_change_24h,
            price_change_percentage_24h: marketData.price_change_percentage_24h
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error getting market data: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to get price history
    this.addCapability({
      name: 'getPriceHistory',
      description: 'Get historical price data for a cryptocurrency',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or symbol of the crypto project'),
        days: z.number().min(1).max(365).default(30).describe('The number of days of data to return')
      }),
      async run({ args }) {
        try {
          const coinId = await self.getCoinId(args.projectIdentifier);
          
          if (!coinId) {
            return JSON.stringify({
              error: `Could not find cryptocurrency with identifier: ${args.projectIdentifier}`
            });
          }
          
          const marketChartUrl = `${self.coinGeckoApiUrl}/coins/${coinId}/market_chart`;
          const response = await axios.get(marketChartUrl, {
            params: {
              vs_currency: 'usd',
              days: args.days,
              interval: args.days > 90 ? 'daily' : 'hourly'
            },
            headers: self.coinGeckoApiKey ? { 'x-cg-api-key': self.coinGeckoApiKey } : {}
          });
          
          if (!response.data) {
            return JSON.stringify({
              error: `Could not retrieve price history for: ${args.projectIdentifier}`
            });
          }
          
          return JSON.stringify({
            id: coinId,
            days: args.days,
            prices: response.data.prices.map((price: [number, number]) => ({
              timestamp: price[0],
              date: new Date(price[0]).toISOString(),
              price: price[1]
            }))
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error getting price history: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to perform market risk assessment
    this.addCapability({
      name: 'assessMarketRisk',
      description: 'Assess market risk for a cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or symbol of the crypto project')
      }),
      async run({ args }) {
        try {
          const coinId = await self.getCoinId(args.projectIdentifier);
          
          if (!coinId) {
            return JSON.stringify({
              error: `Could not find cryptocurrency with identifier: ${args.projectIdentifier}`
            });
          }
          
          const coinData = await self.getCoinMarketData(coinId);
          
          if (!coinData) {
            return JSON.stringify({
              error: `Could not retrieve market data for: ${args.projectIdentifier}`
            });
          }
          
          const priceHistory = await self.getPriceHistory(coinId);
          
          const assessment = self.calculateMarketRiskAssessment(coinData, priceHistory);
          
          return JSON.stringify({
            symbol: assessment.symbol,
            name: assessment.name,
            risk_score: assessment.riskScore,
            risk_level: assessment.riskLevel,
            market_cap: assessment.marketCap,
            market_cap_rank: assessment.marketCapRank,
            current_price: assessment.currentPrice,
            liquidity_score: assessment.liquidity.score,
            liquidity_level: assessment.liquidity.level,
            volatility_score: assessment.volatility.score,
            volatility_level: assessment.volatility.level,
            red_flags: assessment.redFlags,
            positive_indicators: assessment.positiveIndicators
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error assessing market risk: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
  }
} 