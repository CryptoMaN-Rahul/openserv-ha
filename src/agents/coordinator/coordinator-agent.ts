import { z } from 'zod';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';

/**
 * Coordinator Agent
 * Manages workflow and communication between specialized agents
 */
export class CoordinatorAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Coordinator Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to manage workflow and communication between different specialized agents:
1. Blockchain Agent: Analyzes on-chain data with comprehensive risk assessment capabilities
2. Social Media Agent: Monitors Twitter sentiment using advanced LLM-based analysis
3. Market Analysis Agent: Analyzes trading data, price trends, volatility, and liquidity
4. Analysis Agent: Processes all data to calculate overall risk score
5. Reporting Agent: Generates final reports

When a user requests a risk assessment, you should coordinate the data collection process,
ensure all information is gathered properly, and direct the analysis and reporting agents
to generate the final risk assessment report.`;

    super(systemPrompt, 'Coordinator');
    
    this.addCoordinatorCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement coordinator-specific logic
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
    
    // Check for specific agent requests
    if (this.isBlockchainAnalysisRequest(messageText)) {
      await this.handleBlockchainAnalysisRequest(action, messageText);
    } else if (this.isSocialMediaAnalysisRequest(messageText)) {
      await this.handleSocialMediaAnalysisRequest(action, messageText);
    } else if (this.isMarketAnalysisRequest(messageText)) {
      await this.handleMarketAnalysisRequest(action, messageText);
    } else if (this.isRiskAssessmentRequest(messageText)) {
      await this.handleRiskAssessmentRequest(action, messageText);
    } else {
      // Default response for other messages
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `I'm the Coordinator Agent for CryptoRiskGuard. I can help coordinate various types of cryptocurrency analysis:

1. **Full Risk Assessment**: Comprehensive analysis using all available agents
2. **Blockchain Analysis**: On-chain data, contract verification, token holder analysis
3. **Social Media Analysis**: Twitter sentiment and community engagement
4. **Market Analysis**: Price trends, volatility, liquidity, and market metrics

Please specify which type of analysis you'd like and the name or token address of the project.`
      });
    }
  }
  
  /**
   * Check if the message is requesting blockchain analysis
   */
  private isBlockchainAnalysisRequest(message: string): boolean {
    const blockchainKeywords = [
      'blockchain analysis', 'on-chain', 'contract', 'token', 'smart contract',
      'verify contract', 'blockchain agent', 'token holders', 'eth', 'ethereum'
    ];
    
    return blockchainKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) && !this.isFullRiskAssessmentRequest(message);
  }
  
  /**
   * Check if the message is requesting social media analysis
   */
  private isSocialMediaAnalysisRequest(message: string): boolean {
    const socialKeywords = [
      'social media', 'twitter', 'sentiment', 'social', 'community',
      'tweets', 'social sentiment', 'twitter sentiment', 'social analysis'
    ];
    
    return socialKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) && !this.isFullRiskAssessmentRequest(message);
  }
  
  /**
   * Check if the message is requesting market analysis
   */
  private isMarketAnalysisRequest(message: string): boolean {
    const marketKeywords = [
      'market analysis', 'price', 'trading', 'volume', 'liquidity',
      'volatility', 'market cap', 'price trend', 'price history',
      'market data', 'chart', 'market performance'
    ];
    
    return marketKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) && !this.isFullRiskAssessmentRequest(message);
  }
  
  /**
   * Check if the message is requesting a full risk assessment
   */
  private isFullRiskAssessmentRequest(message: string): boolean {
    const riskKeywords = [
      'risk assessment', 'full analysis', 'comprehensive analysis',
      'risk profile', 'analyze project', 'assess risk', 'complete assessment'
    ];
    
    return riskKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if the message is requesting any type of risk assessment
   */
  private isRiskAssessmentRequest(message: string): boolean {
    return this.isFullRiskAssessmentRequest(message) || 
           message.toLowerCase().includes('analyze') || 
           message.toLowerCase().includes('assessment') ||
           message.toLowerCase().includes('evaluate') ||
           message.toLowerCase().includes('cryptocurrency');
  }
  
  /**
   * Handle a blockchain analysis request
   */
  private async handleBlockchainAnalysisRequest(action: z.infer<typeof respondChatMessageActionSchema>, message: string): Promise<void> {
    const projectIdentifier = this.extractProjectIdentifier(message);
    
    if (!projectIdentifier) {
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'd be happy to coordinate a blockchain analysis, but I couldn't identify which cryptocurrency project you want to analyze. Please specify the name or token address of the project."
      });
      return;
    }
    
    this.sendChatMessage({
      workspaceId: action.workspace.id,
      agentId: action.me.id,
      message: `Dispatching blockchain analysis request for ${projectIdentifier} to the Blockchain Agent. The agent will:

1. Verify contract code and check for verification status
2. Analyze token holder distribution and concentration
3. Examine transaction patterns for suspicious activity
4. Check for security vulnerabilities in contract code
5. Calculate a blockchain risk score

Please wait while the Blockchain Agent performs this analysis...`
    });
    
    // In a real implementation, we would now dispatch this to the Blockchain Agent
  }
  
  /**
   * Handle a social media analysis request
   */
  private async handleSocialMediaAnalysisRequest(action: z.infer<typeof respondChatMessageActionSchema>, message: string): Promise<void> {
    const projectIdentifier = this.extractProjectIdentifier(message);
    
    if (!projectIdentifier) {
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'd be happy to coordinate a social media analysis, but I couldn't identify which cryptocurrency project you want to analyze. Please specify the name or token of the project."
      });
      return;
    }
    
    this.sendChatMessage({
      workspaceId: action.workspace.id,
      agentId: action.me.id,
      message: `Dispatching social media analysis request for ${projectIdentifier} to the Social Media Agent. The agent will:

1. Analyze recent Twitter sentiment using LLM-based analysis
2. Evaluate community size and engagement metrics
3. Check for project's official Twitter account and verification status
4. Identify red flags such as spam or bot activity
5. Calculate a social media risk score

Please wait while the Social Media Agent performs this analysis...`
    });
    
    // In a real implementation, we would now dispatch this to the Social Media Agent
  }
  
  /**
   * Handle a market analysis request
   */
  private async handleMarketAnalysisRequest(action: z.infer<typeof respondChatMessageActionSchema>, message: string): Promise<void> {
    const projectIdentifier = this.extractProjectIdentifier(message);
    
    if (!projectIdentifier) {
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'd be happy to coordinate a market analysis, but I couldn't identify which cryptocurrency project you want to analyze. Please specify the name or token symbol of the project."
      });
      return;
    }
    
    this.sendChatMessage({
      workspaceId: action.workspace.id,
      agentId: action.me.id,
      message: `Dispatching market analysis request for ${projectIdentifier} to the Market Analysis Agent. The agent will:

1. Analyze current price and market capitalization
2. Evaluate price trends and volatility patterns
3. Assess trading volume and liquidity metrics
4. Check for market anomalies and potential manipulation
5. Calculate a market risk score based on these factors

Please wait while the Market Analysis Agent performs this analysis...`
    });
    
    // In a real implementation, we would now dispatch this to the Market Analysis Agent
  }
  
  /**
   * Handle a risk assessment request from a user
   */
  private async handleRiskAssessmentRequest(action: z.infer<typeof respondChatMessageActionSchema>, message: string): Promise<void> {
    const projectIdentifier = this.extractProjectIdentifier(message);
    
    if (!projectIdentifier) {
      // If we couldn't identify a project, ask for clarification
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'd be happy to coordinate a risk assessment, but I couldn't identify which cryptocurrency project you want to analyze. Please specify the name or token address of the project."
      });
      return;
    }
    
    // Acknowledge the request and inform about the process
    this.sendChatMessage({
      workspaceId: action.workspace.id,
      agentId: action.me.id,
      message: `I'll coordinate a comprehensive risk assessment for ${projectIdentifier}. The process involves:

1. **Blockchain Analysis**:
   - Contract verification and security vulnerability detection
   - Token holder distribution analysis
   - Transaction pattern analysis

2. **Social Media Analysis**:
   - Twitter sentiment analysis using advanced LLM
   - Community engagement metrics
   - Red flag detection

3. **Market Analysis**:
   - Price trends and volatility assessment
   - Liquidity and trading volume evaluation
   - Market cap and rank considerations

4. **Risk Score Calculation**:
   - Combined risk assessment from all data sources
   - Weighted scoring based on key risk factors

This full analysis will take some time. I'll keep you updated on the progress. Would you like me to proceed with the analysis?`
    });
    
    // In a real implementation, we would now dispatch tasks to the specialized agents
    // and track their progress.
  }
  
  /**
   * Extract the cryptocurrency project name or address from the message
   */
  private extractProjectIdentifier(message: string): string {
    const messageWords = message.split(' ');
    let projectIdentifier = '';
    
    // Look for token addresses (0x...)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      return addressMatch[0];
    }
    
    // Look for keywords like "for" followed by a project name
    for (let i = 0; i < messageWords.length; i++) {
      if (i < messageWords.length - 1 && 
         (messageWords[i].toLowerCase() === 'for' || 
          messageWords[i].toLowerCase() === 'of')) {
        projectIdentifier = messageWords[i + 1];
        // Remove punctuation if present
        projectIdentifier = projectIdentifier.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        break;
      }
    }
    
    // Look for common cryptocurrency names
    const commonCoins = ['bitcoin', 'ethereum', 'bnb', 'solana', 'cardano', 'ripple', 'dogecoin'];
    for (const coin of commonCoins) {
      if (message.toLowerCase().includes(coin)) {
        return coin;
      }
    }
    
    // Look for common cryptocurrency symbols
    const commonSymbols = ['btc', 'eth', 'bnb', 'sol', 'ada', 'xrp', 'doge'];
    for (const symbol of commonSymbols) {
      const regex = new RegExp(`\\b${symbol}\\b`, 'i');
      if (regex.test(message)) {
        return symbol;
      }
    }
    
    return projectIdentifier;
  }
  
  /**
   * Add coordinator-specific capabilities
   */
  private addCoordinatorCapabilities() {
    // Add capability to dispatch tasks to other agents
    this.addCapability({
      name: 'dispatchTask',
      description: 'Dispatch a task to a specialized agent',
      schema: z.object({
        agentType: z.enum(['blockchain', 'social', 'market', 'analysis', 'reporting']),
        taskData: z.record(z.any())
      }),
      async run({ args }) {
        // In a real implementation, this would communicate with other agents
        return `Task dispatched to ${args.agentType} agent with data: ${JSON.stringify(args.taskData)}`;
      }
    });
    
    // Add capability to track task progress
    this.addCapability({
      name: 'checkTaskStatus',
      description: 'Check the status of a dispatched task',
      schema: z.object({
        taskId: z.string()
      }),
      async run({ args }) {
        // In a real implementation, this would check task status
        return `Task ${args.taskId} is in progress`;
      }
    });
    
    // Add capability to coordinate full risk assessment
    this.addCapability({
      name: 'coordinateRiskAssessment',
      description: 'Coordinate a full risk assessment across all agents',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or address of the crypto project'),
        includeBlockchain: z.boolean().default(true),
        includeSocial: z.boolean().default(true),
        includeMarket: z.boolean().default(true)
      }),
      async run({ args }) {
        // In a real implementation, this would coordinate all agents
        return `Coordinating risk assessment for ${args.projectIdentifier} with agents: ${
          [
            args.includeBlockchain ? 'blockchain' : null,
            args.includeSocial ? 'social' : null,
            args.includeMarket ? 'market' : null
          ].filter(Boolean).join(', ')
        }`;
      }
    });
  }
} 