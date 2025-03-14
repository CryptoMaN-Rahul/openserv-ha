import { z } from 'zod';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Define risk assessment data interfaces
interface BlockchainRiskData {
  tokenAddress: string;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  isVerified: boolean;
  contractName?: string;
  tokenSymbol?: string;
  holderConcentration?: {
    topHolderPercentage: number;
    top10Percentage: number;
  };
  riskFactors: string[];
}

interface SocialRiskData {
  projectName: string;
  sentimentScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  tweetCount: number;
  engagementLevel: 'Low' | 'Medium' | 'High';
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  riskFactors: string[];
  positiveFactors: string[];
}

interface MarketRiskData {
  symbol: string;
  name: string;
  priceUsd: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d: number;
  volatility: number;
  liquidity: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskFactors: string[];
  positiveFactors: string[];
}

interface DexRiskData {
  token: string;
  name: string;
  dex_risk_score: number;
  dex_risk_level: 'Low' | 'Medium' | 'High';
  liquidity: number;
  liquidity_level: 'Low' | 'Medium' | 'High';
  volume_24h: number;
  price_change_24h: number;
  red_flags: string[];
  positive_indicators: string[];
}

interface ComprehensiveRiskAssessment {
  projectName: string;
  tokenSymbol: string;
  tokenAddress?: string;
  overallRiskScore: number;
  overallRiskLevel: 'Low' | 'Medium' | 'High';
  blockchainRisk?: {
    score: number;
    level: 'Low' | 'Medium' | 'High';
    keyIssues: string[];
    positiveFactors: string[];
  };
  socialRisk?: {
    score: number;
    level: 'Low' | 'Medium' | 'High';
    keyIssues: string[];
    positiveFactors: string[];
  };
  marketRisk?: {
    score: number;
    level: 'Low' | 'Medium' | 'High';
    keyIssues: string[];
    positiveFactors: string[];
  };
  dexRisk?: {
    score: number;
    level: 'Low' | 'Medium' | 'High';
    keyIssues: string[];
    positiveFactors: string[];
  };
  riskBreakdown: {
    blockchain: number;
    social: number;
    market: number;
    dex: number;
  };
  riskFactors: string[];
  positiveFactors: string[];
  analysisTime: string;
}

/**
 * Analysis Agent
 * Responsible for aggregating data from all specialized agents and calculating a comprehensive risk score
 */
export class AnalysisAgent extends BaseAgent {
  // Specialized agents for data collection
  private blockchainAgent: any;
  private socialMediaAgent: any;
  private marketAnalysisAgent: any;
  private dexScreenerAgent: any;
  
  constructor() {
    const systemPrompt = `You are the Analysis Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to aggregate data from specialized agents and calculate a comprehensive risk score.
You should:
1. Collect risk data from the Blockchain, Social Media, Market Analysis, and DexScreener agents
2. Weight different risk factors based on their importance and reliability
3. Calculate an overall risk score and risk level
4. Generate a comprehensive risk assessment with detailed breakdown of findings
5. Provide actionable insights based on the risk assessment

Always provide balanced analysis that considers both risk factors and positive indicators.
Use markdown formatting to present data clearly, and prioritize the most significant findings.`;

    super(systemPrompt, 'Analysis');
    
    // Add analysis-specific capabilities
    this.addAnalysisCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement analysis-specific logic
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
    
    // Check if the message is asking for risk analysis
    const isAnalysisRequest = this.isRiskAnalysisRequest(messageText);
    
    if (isAnalysisRequest) {
      // Extract project identifier (token address, symbol, or name)
      const projectIdentifier = this.extractProjectIdentifier(messageText);
      
      if (projectIdentifier) {
        await this.performRiskAnalysis(action, projectIdentifier);
      } else {
        // No project identifier found
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: "I need a specific cryptocurrency project to analyze. Please provide a token address, symbol (like BTC, ETH), or project name."
        });
      }
    } else {
      // Default response when not asking for risk analysis
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'm the Analysis Agent for CryptoRiskGuard. I aggregate data from specialized agents to provide comprehensive risk assessments for cryptocurrency projects. To analyze a project, please ask for a 'risk analysis' or 'risk assessment' and include a token address, symbol, or project name."
      });
    }
  }
  
  /**
   * Check if the message is requesting risk analysis
   */
  private isRiskAnalysisRequest(message: string): boolean {
    const analysisKeywords = [
      'risk analysis',
      'risk assessment',
      'analyze risk',
      'assess risk',
      'evaluate risk',
      'risk profile',
      'risk score',
      'how risky',
      'risk level',
      'analyze project',
      'comprehensive analysis'
    ];
    
    const lowercaseMessage = message.toLowerCase();
    return analysisKeywords.some(keyword => lowercaseMessage.includes(keyword));
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
    
    // Look for common token symbols/names using common patterns in user requests
    const projectPatterns = [
      /for\s+([a-zA-Z0-9]+)/i,
      /of\s+([a-zA-Z0-9]+)/i,
      /about\s+([a-zA-Z0-9]+)/i,
      /analyze\s+([a-zA-Z0-9]+)/i,
      /assess\s+([a-zA-Z0-9]+)/i,
      /([a-zA-Z0-9]+)\s+risk/i,
      /([a-zA-Z0-9]+)\s+token/i,
      /([a-zA-Z0-9]+)\s+project/i
    ];
    
    for (const pattern of projectPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Filter out common words that might match but aren't project names
        const commonWords = ['the', 'this', 'that', 'it', 'a', 'an', 'risk', 'token', 'project', 'crypto'];
        if (!commonWords.includes(match[1].toLowerCase())) {
          return match[1];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Perform comprehensive risk analysis
   */
  private async performRiskAnalysis(action: z.infer<typeof respondChatMessageActionSchema>, projectIdentifier: string): Promise<void> {
    try {
      // First, acknowledge that we're analyzing the project
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `🔍 Performing comprehensive risk analysis for ${projectIdentifier}...\n\n1️⃣ Gathering blockchain data\n2️⃣ Analyzing social media sentiment\n3️⃣ Evaluating market performance\n4️⃣ Assessing DEX metrics\n5️⃣ Calculating comprehensive risk score\n\nPlease wait while I aggregate data from all specialized agents...`
      });
      
      // Attempt to get data from all specialized agents
      // Note: Some data might be missing depending on the project
      const blockchainData = await this.getBlockchainRiskData(projectIdentifier);
      const socialData = await this.getSocialRiskData(projectIdentifier);
      const marketData = await this.getMarketRiskData(projectIdentifier);
      const dexData = await this.getDexRiskData(projectIdentifier);
      
      // Check if we have enough data to perform analysis
      if (!blockchainData && !socialData && !marketData && !dexData) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `⚠️ I couldn't gather sufficient data about "${projectIdentifier}" from any of our specialized agents. Please check the project identifier and try again with a token address, symbol, or full name.`
        });
        return;
      }
      
      // Calculate comprehensive risk assessment
      const assessment = this.calculateComprehensiveRisk(
        projectIdentifier,
        blockchainData,
        socialData,
        marketData,
        dexData
      );
      
      // Send the analysis results with rich formatting
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: this.formatRiskAssessmentReport(assessment)
      });
    } catch (error) {
      console.error('Error performing risk analysis:', error);
      
      // Send error message
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `Error analyzing risk for ${projectIdentifier}. ${error instanceof Error ? error.message : 'Please try again later.'}`
      });
    }
  }
  
  /**
   * Get blockchain risk data from Blockchain Agent
   */
  private async getBlockchainRiskData(projectIdentifier: string): Promise<BlockchainRiskData | null> {
    try {
      // Check if the project identifier is an Ethereum address
      const isAddress = projectIdentifier.startsWith('0x') && projectIdentifier.length === 42;
      
      if (!isAddress) {
        // If not an address, we can't get blockchain data
        return null;
      }
      
      // In a real implementation, this would call the Blockchain Agent's API
      // For now, we'll simulate the response
      
      // Simulated call to Blockchain Agent
      const response = await this.callAgentCapability(
        'BlockchainAgent',
        'assessBlockchainRisk',
        { tokenAddress: projectIdentifier }
      );
      
      if (!response) {
        return null;
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Error getting blockchain risk data:', error);
      return null;
    }
  }
  
  /**
   * Get social media risk data from Social Media Agent
   */
  private async getSocialRiskData(projectIdentifier: string): Promise<SocialRiskData | null> {
    try {
      // Simulated call to Social Media Agent
      const response = await this.callAgentCapability(
        'SocialMediaAgent',
        'analyzeSentiment',
        { projectName: projectIdentifier }
      );
      
      if (!response) {
        return null;
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Error getting social risk data:', error);
      return null;
    }
  }
  
  /**
   * Get market risk data from Market Analysis Agent
   */
  private async getMarketRiskData(projectIdentifier: string): Promise<MarketRiskData | null> {
    try {
      // Simulated call to Market Analysis Agent
      const response = await this.callAgentCapability(
        'MarketAnalysisAgent',
        'analyzeMarketRisk',
        { tokenIdentifier: projectIdentifier }
      );
      
      if (!response) {
        return null;
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Error getting market risk data:', error);
      return null;
    }
  }
  
  /**
   * Get DEX risk data from DexScreener Agent
   */
  private async getDexRiskData(projectIdentifier: string): Promise<DexRiskData | null> {
    try {
      // Simulated call to DexScreener Agent
      const response = await this.callAgentCapability(
        'DexScreenerAgent',
        'assessDexRisk',
        { tokenIdentifier: projectIdentifier }
      );
      
      if (!response) {
        return null;
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Error getting DEX risk data:', error);
      return null;
    }
  }
  
  /**
   * Call a capability on another agent
   * Note: In a real implementation, this would use the OpenServ APIs
   */
  private async callAgentCapability(
    agentName: string,
    capabilityName: string,
    args: any
  ): Promise<string | null> {
    // This is a simulated implementation
    // In a real setup, this would make API calls to the agent's capabilities
    
    // For demonstration purposes, we'll return simulated responses based on inputs
    
    // Here we would use axios to call the OpenServ API to invoke capabilities
    // For now, return null to simulate failure to get data
    return null;
  }
  
  /**
   * Calculate comprehensive risk assessment from all data sources
   */
  private calculateComprehensiveRisk(
    projectIdentifier: string,
    blockchainData: BlockchainRiskData | null,
    socialData: SocialRiskData | null,
    marketData: MarketRiskData | null,
    dexData: DexRiskData | null
  ): ComprehensiveRiskAssessment {
    // Extract project name and symbol
    const projectName = socialData?.projectName || 
                       marketData?.name || 
                       blockchainData?.contractName || 
                       dexData?.name || 
                       projectIdentifier;
    
    const tokenSymbol = marketData?.symbol || 
                       blockchainData?.tokenSymbol || 
                       dexData?.token || 
                       projectIdentifier;
    
    // Initialize risk breakdown with default weights
    // These weights determine how much each factor contributes to the final score
    const riskBreakdown = {
      blockchain: 0,
      social: 0,
      market: 0,
      dex: 0
    };
    
    // Set individual risk scores and calculate weighted components
    let totalWeight = 0;
    let weightedScore = 0;
    
    // Blockchain risk (35% weight when available)
    if (blockchainData) {
      riskBreakdown.blockchain = blockchainData.riskScore;
      weightedScore += blockchainData.riskScore * 0.35;
      totalWeight += 0.35;
    }
    
    // Social risk (20% weight when available)
    if (socialData) {
      // Normalize sentiment score to 0-100 scale where 100 is highest risk
      const normalizedScore = (1 - (socialData.sentimentScore + 1) / 2) * 100;
      riskBreakdown.social = normalizedScore;
      weightedScore += normalizedScore * 0.2;
      totalWeight += 0.2;
    }
    
    // Market risk (25% weight when available)
    if (marketData) {
      riskBreakdown.market = marketData.riskScore;
      weightedScore += marketData.riskScore * 0.25;
      totalWeight += 0.25;
    }
    
    // DEX risk (20% weight when available)
    if (dexData) {
      riskBreakdown.dex = dexData.dex_risk_score;
      weightedScore += dexData.dex_risk_score * 0.2;
      totalWeight += 0.2;
    }
    
    // Calculate overall risk score (normalized by total weight)
    const overallRiskScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
    
    // Determine overall risk level
    let overallRiskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    if (overallRiskScore < 40) overallRiskLevel = 'Low';
    else if (overallRiskScore > 70) overallRiskLevel = 'High';
    
    // Compile risk factors and positive factors
    const riskFactors: string[] = [];
    const positiveFactors: string[] = [];
    
    // Add blockchain risk factors
    if (blockchainData) {
      // Add the top 3 most important risk factors
      blockchainData.riskFactors.slice(0, 3).forEach(factor => {
        riskFactors.push(`[Blockchain] ${factor}`);
      });
    }
    
    // Add social risk factors
    if (socialData) {
      // Add negative factors
      socialData.riskFactors.slice(0, 2).forEach(factor => {
        riskFactors.push(`[Social] ${factor}`);
      });
      
      // Add positive factors
      socialData.positiveFactors.slice(0, 2).forEach(factor => {
        positiveFactors.push(`[Social] ${factor}`);
      });
    }
    
    // Add market risk factors
    if (marketData) {
      // Add negative factors
      marketData.riskFactors.slice(0, 2).forEach(factor => {
        riskFactors.push(`[Market] ${factor}`);
      });
      
      // Add positive factors
      marketData.positiveFactors.slice(0, 2).forEach(factor => {
        positiveFactors.push(`[Market] ${factor}`);
      });
    }
    
    // Add DEX risk factors
    if (dexData) {
      // Add negative factors
      dexData.red_flags.slice(0, 2).forEach(factor => {
        riskFactors.push(`[DEX] ${factor}`);
      });
      
      // Add positive factors
      dexData.positive_indicators.slice(0, 2).forEach(factor => {
        positiveFactors.push(`[DEX] ${factor}`);
      });
    }
    
    // Create comprehensive assessment
    const assessment: ComprehensiveRiskAssessment = {
      projectName,
      tokenSymbol,
      overallRiskScore,
      overallRiskLevel,
      riskBreakdown,
      riskFactors,
      positiveFactors,
      analysisTime: new Date().toISOString()
    };
    
    // Add token address if available
    if (blockchainData?.tokenAddress) {
      assessment.tokenAddress = blockchainData.tokenAddress;
    }
    
    // Add detailed risk components if available
    if (blockchainData) {
      assessment.blockchainRisk = {
        score: blockchainData.riskScore,
        level: blockchainData.riskLevel,
        keyIssues: blockchainData.riskFactors.slice(0, 3),
        positiveFactors: []
      };
    }
    
    if (socialData) {
      assessment.socialRisk = {
        score: riskBreakdown.social,
        level: socialData.riskLevel,
        keyIssues: socialData.riskFactors.slice(0, 3),
        positiveFactors: socialData.positiveFactors.slice(0, 3)
      };
    }
    
    if (marketData) {
      assessment.marketRisk = {
        score: marketData.riskScore,
        level: marketData.riskLevel,
        keyIssues: marketData.riskFactors.slice(0, 3),
        positiveFactors: marketData.positiveFactors.slice(0, 3)
      };
    }
    
    if (dexData) {
      assessment.dexRisk = {
        score: dexData.dex_risk_score,
        level: dexData.dex_risk_level as 'Low' | 'Medium' | 'High',
        keyIssues: dexData.red_flags.slice(0, 3),
        positiveFactors: dexData.positive_indicators.slice(0, 3)
      };
    }
    
    return assessment;
  }
  
  /**
   * Format risk assessment report with rich markdown
   */
  private formatRiskAssessmentReport(assessment: ComprehensiveRiskAssessment): string {
    // Get risk level badge
    const riskBadge = assessment.overallRiskLevel === 'Low' ? '🟢 **LOW RISK**' : 
                    assessment.overallRiskLevel === 'Medium' ? '🟠 **MEDIUM RISK**' : 
                    '🔴 **HIGH RISK**';
    
    // Format risk factors section
    const riskFactorsSection = assessment.riskFactors.length > 0 ? 
      assessment.riskFactors.map(factor => `- ${factor}`).join('\n') : 
      '- No significant risk factors identified';
    
    const positiveFactorsSection = assessment.positiveFactors.length > 0 ? 
      assessment.positiveFactors.map(factor => `- ${factor}`).join('\n') : 
      '- No significant positive factors identified';
    
    // Format component sections
    let componentSections = '';
    
    // Blockchain section
    if (assessment.blockchainRisk) {
      const blockchainRiskBadge = assessment.blockchainRisk.level === 'Low' ? '🟢 Low Risk' : 
                               assessment.blockchainRisk.level === 'Medium' ? '🟠 Medium Risk' : 
                               '🔴 High Risk';
      
      componentSections += `### Blockchain Analysis
**Risk Score:** ${assessment.blockchainRisk.score}/100 (${blockchainRiskBadge})

**Key Issues:**
${assessment.blockchainRisk.keyIssues.length > 0 ? 
  assessment.blockchainRisk.keyIssues.map(issue => `- ${issue}`).join('\n') : 
  '- No significant issues detected'}

`;
    }
    
    // Social media section
    if (assessment.socialRisk) {
      const socialRiskBadge = assessment.socialRisk.level === 'Low' ? '🟢 Low Risk' : 
                           assessment.socialRisk.level === 'Medium' ? '🟠 Medium Risk' : 
                           '🔴 High Risk';
      
      componentSections += `### Social Media Analysis
**Risk Score:** ${assessment.socialRisk.score.toFixed(0)}/100 (${socialRiskBadge})

**Key Issues:**
${assessment.socialRisk.keyIssues.length > 0 ? 
  assessment.socialRisk.keyIssues.map(issue => `- ${issue}`).join('\n') : 
  '- No significant issues detected'}

**Positive Factors:**
${assessment.socialRisk.positiveFactors.length > 0 ? 
  assessment.socialRisk.positiveFactors.map(factor => `- ${factor}`).join('\n') : 
  '- No significant positive factors identified'}

`;
    }
    
    // Market section
    if (assessment.marketRisk) {
      const marketRiskBadge = assessment.marketRisk.level === 'Low' ? '🟢 Low Risk' : 
                           assessment.marketRisk.level === 'Medium' ? '🟠 Medium Risk' : 
                           '🔴 High Risk';
      
      componentSections += `### Market Analysis
**Risk Score:** ${assessment.marketRisk.score}/100 (${marketRiskBadge})

**Key Issues:**
${assessment.marketRisk.keyIssues.length > 0 ? 
  assessment.marketRisk.keyIssues.map(issue => `- ${issue}`).join('\n') : 
  '- No significant issues detected'}

**Positive Factors:**
${assessment.marketRisk.positiveFactors.length > 0 ? 
  assessment.marketRisk.positiveFactors.map(factor => `- ${factor}`).join('\n') : 
  '- No significant positive factors identified'}

`;
    }
    
    // DEX section
    if (assessment.dexRisk) {
      const dexRiskBadge = assessment.dexRisk.level === 'Low' ? '🟢 Low Risk' : 
                         assessment.dexRisk.level === 'Medium' ? '🟠 Medium Risk' : 
                         '🔴 High Risk';
      
      componentSections += `### DEX Analysis
**Risk Score:** ${assessment.dexRisk.score}/100 (${dexRiskBadge})

**Key Issues:**
${assessment.dexRisk.keyIssues.length > 0 ? 
  assessment.dexRisk.keyIssues.map(issue => `- ${issue}`).join('\n') : 
  '- No significant issues detected'}

**Positive Factors:**
${assessment.dexRisk.positiveFactors.length > 0 ? 
  assessment.dexRisk.positiveFactors.map(factor => `- ${factor}`).join('\n') : 
  '- No significant positive factors identified'}

`;
    }
    
    // Generate recommendations based on risk level
    const recommendations = this.generateRecommendations(assessment);
    
    // Format date
    const analysisDate = new Date(assessment.analysisTime).toLocaleString();
    
    // Assemble the complete report
    return `# Comprehensive Risk Assessment for ${assessment.projectName} (${assessment.tokenSymbol})

## Risk Summary
**Overall Risk Score:** ${assessment.overallRiskScore}/100 (${assessment.overallRiskLevel} Risk)
${riskBadge}

## Key Metrics
${assessment.tokenAddress ? `- **Token Address:** ${assessment.tokenAddress}` : ''}
- **Analysis Date:** ${analysisDate}

## Risk Breakdown
${assessment.blockchainRisk ? `- **Blockchain Risk:** ${assessment.blockchainRisk.score}/100 (${assessment.blockchainRisk.level})` : '- **Blockchain Risk:** Not Available'}
${assessment.socialRisk ? `- **Social Media Risk:** ${assessment.socialRisk.score.toFixed(0)}/100 (${assessment.socialRisk.level})` : '- **Social Media Risk:** Not Available'}
${assessment.marketRisk ? `- **Market Risk:** ${assessment.marketRisk.score}/100 (${assessment.marketRisk.level})` : '- **Market Risk:** Not Available'}
${assessment.dexRisk ? `- **DEX Risk:** ${assessment.dexRisk.score}/100 (${assessment.dexRisk.level})` : '- **DEX Risk:** Not Available'}

## Key Risk Factors
${riskFactorsSection}

## Positive Indicators
${positiveFactorsSection}

## Detailed Analysis
${componentSections}
## Recommendations
${recommendations}

*This is an automated risk assessment. Always conduct your own research before making investment decisions.*`;
  }
  
  /**
   * Generate recommendations based on risk assessment
   */
  private generateRecommendations(assessment: ComprehensiveRiskAssessment): string {
    const recommendations: string[] = [];
    
    // High-level recommendation based on overall risk
    if (assessment.overallRiskLevel === 'High') {
      recommendations.push('⚠️ **HIGH RISK DETECTED** - This project exhibits multiple significant risk factors that suggest caution is warranted.');
      recommendations.push('⚠️ If considering investment, allocate only a small portion of your portfolio that you can afford to lose completely.');
    } else if (assessment.overallRiskLevel === 'Medium') {
      recommendations.push('⚠️ **MODERATE RISK DETECTED** - This project has some concerning factors balanced by positive indicators.');
      recommendations.push('⚠️ Consider limiting exposure and implementing strict risk management strategies if investing.');
    } else {
      recommendations.push('✅ **FAVORABLE RISK PROFILE** - This project demonstrates relatively lower risk factors compared to typical cryptocurrency projects.');
      recommendations.push('✅ While lower risk, remember that all cryptocurrency investments carry inherent volatility and uncertainty.');
    }
    
    // Specific recommendations based on component risks
    if (assessment.blockchainRisk && assessment.blockchainRisk.level === 'High') {
      recommendations.push('⚠️ **Blockchain Concerns:** The on-chain analysis reveals significant technical risks that could impact token security and stability.');
    }
    
    if (assessment.socialRisk && assessment.socialRisk.level === 'High') {
      recommendations.push('⚠️ **Social Media Concerns:** Negative sentiment and concerning discussions suggest community/public perception issues.');
    }
    
    if (assessment.marketRisk && assessment.marketRisk.level === 'High') {
      recommendations.push('⚠️ **Market Concerns:** Price action and market metrics indicate potentially unstable trading conditions.');
    }
    
    if (assessment.dexRisk && assessment.dexRisk.level === 'High') {
      recommendations.push('⚠️ **DEX Concerns:** Low liquidity or concerning trading patterns detected on decentralized exchanges.');
    }
    
    // Basic investment advice
    recommendations.push('➡️ Always diversify your cryptocurrency investments across multiple projects to reduce risk exposure.');
    recommendations.push('➡️ Consider setting stop-loss orders or clear exit points before investing in any cryptocurrency.');
    
    // Add due diligence reminder
    recommendations.push('➡️ This assessment should be one part of your research process. Additional due diligence is always recommended.');
    
    return recommendations.join('\n');
  }
  
  /**
   * Add analysis-specific capabilities
   */
  private addAnalysisCapabilities() {
    const self = this; // Store reference to this instance
    
    // Add capability to perform full risk assessment
    this.addCapability({
      name: 'performRiskAssessment',
      description: 'Perform a comprehensive risk assessment of a cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The token address, symbol, or name of the project to analyze')
      }),
      async run({ args }) {
        try {
          // Get data from all specialized agents
          const blockchainData = await self.getBlockchainRiskData(args.projectIdentifier);
          const socialData = await self.getSocialRiskData(args.projectIdentifier);
          const marketData = await self.getMarketRiskData(args.projectIdentifier);
          const dexData = await self.getDexRiskData(args.projectIdentifier);
          
          // Check if we have enough data
          if (!blockchainData && !socialData && !marketData && !dexData) {
            return JSON.stringify({
              error: `Insufficient data available for ${args.projectIdentifier}`
            });
          }
          
          // Calculate comprehensive risk
          const assessment = self.calculateComprehensiveRisk(
            args.projectIdentifier,
            blockchainData,
            socialData,
            marketData,
            dexData
          );
          
          return JSON.stringify(assessment, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error performing risk assessment: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to get risk breakdown
    this.addCapability({
      name: 'getRiskBreakdown',
      description: 'Get a breakdown of risk factors for a cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The token address, symbol, or name of the project to analyze')
      }),
      async run({ args }) {
        try {
          // Get data from all specialized agents
          const blockchainData = await self.getBlockchainRiskData(args.projectIdentifier);
          const socialData = await self.getSocialRiskData(args.projectIdentifier);
          const marketData = await self.getMarketRiskData(args.projectIdentifier);
          const dexData = await self.getDexRiskData(args.projectIdentifier);
          
          // Check if we have enough data
          if (!blockchainData && !socialData && !marketData && !dexData) {
            return JSON.stringify({
              error: `Insufficient data available for ${args.projectIdentifier}`
            });
          }
          
          // Extract just the risk factors
          const riskFactors: string[] = [];
          
          if (blockchainData) {
            blockchainData.riskFactors.forEach(factor => {
              riskFactors.push(`[Blockchain] ${factor}`);
            });
          }
          
          if (socialData) {
            socialData.riskFactors.forEach(factor => {
              riskFactors.push(`[Social] ${factor}`);
            });
          }
          
          if (marketData) {
            marketData.riskFactors.forEach(factor => {
              riskFactors.push(`[Market] ${factor}`);
            });
          }
          
          if (dexData) {
            dexData.red_flags.forEach(factor => {
              riskFactors.push(`[DEX] ${factor}`);
            });
          }
          
          return JSON.stringify({
            projectIdentifier: args.projectIdentifier,
            riskFactors,
            riskBreakdown: {
              blockchain: blockchainData?.riskScore || 0,
              social: socialData ? ((1 - (socialData.sentimentScore + 1) / 2) * 100) : 0,
              market: marketData?.riskScore || 0,
              dex: dexData?.dex_risk_score || 0
            }
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error getting risk breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
  }
} 