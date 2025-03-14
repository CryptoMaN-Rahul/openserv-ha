import { z } from 'zod';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Reporting Agent
 * Responsible for generating comprehensive PDF reports for risk assessments
 */
export class ReportingAgent extends BaseAgent {
  // Directory to store reports
  private reportsDirectory: string = './reports';
  
  constructor() {
    const systemPrompt = `You are the Reporting Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to generate comprehensive PDF reports for users based on risk assessments.
You should:
1. Create professionally formatted reports that summarize risk data
2. Include visualizations of risk scores and metrics
3. Organize findings in a clear, actionable format
4. Provide downloadable documents for reference
5. Keep a record of generated reports for future reference

Always provide balanced reports that present both risk factors and positive indicators.
Use professional language and clear data visualizations to help users understand complex risk assessments.`;

    super(systemPrompt, 'Reporting');
    
    // Create reports directory if it doesn't exist
    this.ensureReportsDirectoryExists();
    
    // Add reporting-specific capabilities
    this.addReportingCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement reporting-specific logic
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
    
    // Check if the message is requesting a report
    const isReportRequest = this.isReportRequest(messageText);
    
    if (isReportRequest) {
      // Extract project identifier (token address, symbol, or name)
      const projectIdentifier = this.extractProjectIdentifier(messageText);
      
      if (projectIdentifier) {
        await this.generateReport(action, projectIdentifier);
      } else {
        // No project identifier found
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: "I need a specific cryptocurrency project to generate a report for. Please provide a token address, symbol (like BTC, ETH), or project name."
        });
      }
    } else {
      // Default response when not asking for a report
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'm the Reporting Agent for CryptoRiskGuard. I can generate comprehensive PDF reports for cryptocurrency risk assessments. To create a report, please ask for a 'report' or 'PDF report' and include a token address, symbol, or project name."
      });
    }
  }
  
  /**
   * Check if the message is requesting a report
   */
  private isReportRequest(message: string): boolean {
    const reportKeywords = [
      'report',
      'pdf',
      'document',
      'generate report',
      'create report',
      'download report',
      'get report',
      'make report',
      'export report',
      'documentation'
    ];
    
    const lowercaseMessage = message.toLowerCase();
    return reportKeywords.some(keyword => lowercaseMessage.includes(keyword));
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
      /report\s+for\s+([a-zA-Z0-9]+)/i,
      /report\s+on\s+([a-zA-Z0-9]+)/i,
      /([a-zA-Z0-9]+)\s+report/i,
      /([a-zA-Z0-9]+)\s+pdf/i,
      /([a-zA-Z0-9]+)\s+analysis/i
    ];
    
    for (const pattern of projectPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Filter out common words that might match but aren't project names
        const commonWords = ['the', 'this', 'that', 'it', 'a', 'an', 'report', 'pdf', 'analysis'];
        if (!commonWords.includes(match[1].toLowerCase())) {
          return match[1];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Generate PDF report for a project
   */
  private async generateReport(action: z.infer<typeof respondChatMessageActionSchema>, projectIdentifier: string): Promise<void> {
    try {
      // First, acknowledge that we're generating the report
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `📊 Generating comprehensive risk assessment report for ${projectIdentifier}...\n\n1️⃣ Retrieving risk assessment data\n2️⃣ Creating data visualizations\n3️⃣ Formatting PDF document\n4️⃣ Preparing for download\n\nPlease wait while I compile your report...`
      });
      
      // Get risk assessment data from Analysis Agent
      const assessmentData = await this.getRiskAssessmentData(projectIdentifier);
      
      if (!assessmentData) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `⚠️ I couldn't retrieve risk assessment data for "${projectIdentifier}". Please make sure this project has been analyzed by requesting a risk assessment first.`
        });
        return;
      }
      
      // In a real implementation, this would generate an actual PDF
      // For this simulation, we'll create a text-based report
      
      // Generate a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${projectIdentifier.toLowerCase()}_risk_report_${timestamp}.txt`;
      const filePath = path.join(this.reportsDirectory, filename);
      
      // Format the report content
      const reportContent = this.formatReportContent(assessmentData);
      
      // Write the report to a file
      fs.writeFileSync(filePath, reportContent);
      
      // In a real implementation, this would be a downloadable link to the PDF
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `✅ Report generated successfully for ${assessmentData.projectName} (${assessmentData.tokenSymbol})!\n\n**Risk Summary**\n- Overall Risk Score: ${assessmentData.overallRiskScore}/100 (${assessmentData.overallRiskLevel} Risk)\n- Generated: ${new Date().toLocaleString()}\n\nThe report includes detailed analysis from all specialized agents:\n- Blockchain analysis (contract verification, holder distribution, security patterns)\n- Social media sentiment (Twitter discussions, engagement metrics)\n- Market data (price trends, volatility, liquidity)\n- DEX analytics (trading patterns, liquidity depth, buy/sell ratios)\n\nReport saved as \`${filename}\` in the reports directory.\n\nIn a production environment, this would be a downloadable PDF with rich visualizations and formatted data.`
      });
    } catch (error) {
      console.error('Error generating report:', error);
      
      // Send error message
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `Error generating report for ${projectIdentifier}. ${error instanceof Error ? error.message : 'Please try again later.'}`
      });
    }
  }
  
  /**
   * Ensure the reports directory exists
   */
  private ensureReportsDirectoryExists(): void {
    if (!fs.existsSync(this.reportsDirectory)) {
      fs.mkdirSync(this.reportsDirectory, { recursive: true });
    }
  }
  
  /**
   * Get risk assessment data from Analysis Agent
   */
  private async getRiskAssessmentData(projectIdentifier: string): Promise<any | null> {
    try {
      // In a real implementation, this would call the Analysis Agent's API
      // For now, we'll simulate the response with mock data
      
      // Simulated call to Analysis Agent
      const response = await this.callAgentCapability(
        'AnalysisAgent',
        'performRiskAssessment',
        { projectIdentifier }
      );
      
      if (!response) {
        return this.createMockAssessmentData(projectIdentifier);
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Error getting risk assessment data:', error);
      
      // For demonstration, return mock data
      return this.createMockAssessmentData(projectIdentifier);
    }
  }
  
  /**
   * Create mock assessment data for demonstration
   */
  private createMockAssessmentData(projectIdentifier: string): any {
    // Use first character of identifier to determine risk level for demonstration
    const firstChar = projectIdentifier.charAt(0).toLowerCase();
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    let riskScore = 50;
    
    // Pseudo-random but deterministic risk level based on input
    if (['a', 'b', 'c', 'd', 'e'].includes(firstChar)) {
      riskLevel = 'Low';
      riskScore = 30;
    } else if (['v', 'w', 'x', 'y', 'z'].includes(firstChar)) {
      riskLevel = 'High';
      riskScore = 75;
    }
    
    return {
      projectName: projectIdentifier.charAt(0).toUpperCase() + projectIdentifier.slice(1),
      tokenSymbol: projectIdentifier.toUpperCase().slice(0, 4),
      tokenAddress: projectIdentifier.startsWith('0x') ? projectIdentifier : '0x1234567890abcdef1234567890abcdef12345678',
      overallRiskScore: riskScore,
      overallRiskLevel: riskLevel,
      riskBreakdown: {
        blockchain: riskScore + 5,
        social: riskScore - 10,
        market: riskScore + 2,
        dex: riskScore - 5
      },
      riskFactors: [
        '[Blockchain] Contract has owner privileges that could allow centralized control',
        '[Social] Negative sentiment detected in recent discussions',
        '[Market] High volatility compared to market average',
        '[DEX] Liquidity is concentrated in a single trading pair'
      ],
      positiveFactors: [
        '[Blockchain] Contract is verified and audited',
        '[Social] Active and growing community engagement',
        '[Market] Consistent trading volume over time',
        '[DEX] Multiple trading pairs available across different DEXes'
      ],
      analysisTime: new Date().toISOString(),
      blockchainRisk: {
        score: riskScore + 5,
        level: riskLevel,
        keyIssues: ['Contract has owner privileges', 'Token concentration in top holders'],
        positiveFactors: ['Contract is verified', 'No obvious rug pull mechanisms']
      },
      socialRisk: {
        score: riskScore - 10,
        level: riskLevel === 'High' ? 'Medium' : riskLevel === 'Medium' ? 'Low' : 'Low',
        keyIssues: ['Some negative posts recently', 'Limited official communication'],
        positiveFactors: ['Growing follower count', 'Active developer updates']
      },
      marketRisk: {
        score: riskScore + 2,
        level: riskLevel,
        keyIssues: ['Price volatility above average', 'Limited trading history'],
        positiveFactors: ['Consistent volume growth', 'Market cap is reasonable for project stage']
      },
      dexRisk: {
        score: riskScore - 5,
        level: riskLevel === 'High' ? 'Medium' : riskLevel === 'Medium' ? 'Low' : 'Low',
        keyIssues: ['Liquidity concentration in one pair', 'Low volume to liquidity ratio'],
        positiveFactors: ['Multiple DEX listings', 'Balanced buy/sell ratio']
      }
    };
  }
  
  /**
   * Format report content
   */
  private formatReportContent(assessmentData: any): string {
    const timestamp = new Date().toLocaleString();
    
    // For a real implementation, this would create a properly formatted PDF
    // For this demo, we'll create a text-based report
    
    return `
=====================================================
CRYPTORISKGUARD RISK ASSESSMENT REPORT
=====================================================
Project: ${assessmentData.projectName} (${assessmentData.tokenSymbol})
Generated: ${timestamp}
Token Address: ${assessmentData.tokenAddress}

-----------------------------------------------------
RISK SUMMARY
-----------------------------------------------------
Overall Risk Score: ${assessmentData.overallRiskScore}/100
Risk Level: ${assessmentData.overallRiskLevel.toUpperCase()}

Risk Breakdown:
- Blockchain Risk: ${assessmentData.riskBreakdown.blockchain}/100
- Social Media Risk: ${assessmentData.riskBreakdown.social}/100
- Market Risk: ${assessmentData.riskBreakdown.market}/100
- DEX Risk: ${assessmentData.riskBreakdown.dex}/100

-----------------------------------------------------
KEY RISK FACTORS
-----------------------------------------------------
${assessmentData.riskFactors.join('\n')}

-----------------------------------------------------
POSITIVE INDICATORS
-----------------------------------------------------
${assessmentData.positiveFactors.join('\n')}

-----------------------------------------------------
DETAILED ANALYSIS
-----------------------------------------------------

BLOCKCHAIN ANALYSIS
Score: ${assessmentData.blockchainRisk?.score}/100
Level: ${assessmentData.blockchainRisk?.level}

Key Issues:
${assessmentData.blockchainRisk?.keyIssues.join('\n')}

Positive Factors:
${assessmentData.blockchainRisk?.positiveFactors.join('\n')}

-----------------------------------------------------

SOCIAL MEDIA ANALYSIS
Score: ${assessmentData.socialRisk?.score}/100
Level: ${assessmentData.socialRisk?.level}

Key Issues:
${assessmentData.socialRisk?.keyIssues.join('\n')}

Positive Factors:
${assessmentData.socialRisk?.positiveFactors.join('\n')}

-----------------------------------------------------

MARKET ANALYSIS
Score: ${assessmentData.marketRisk?.score}/100
Level: ${assessmentData.marketRisk?.level}

Key Issues:
${assessmentData.marketRisk?.keyIssues.join('\n')}

Positive Factors:
${assessmentData.marketRisk?.positiveFactors.join('\n')}

-----------------------------------------------------

DEX ANALYSIS
Score: ${assessmentData.dexRisk?.score}/100
Level: ${assessmentData.dexRisk?.level}

Key Issues:
${assessmentData.dexRisk?.keyIssues.join('\n')}

Positive Factors:
${assessmentData.dexRisk?.positiveFactors.join('\n')}

-----------------------------------------------------
RECOMMENDATIONS
-----------------------------------------------------
1. ${assessmentData.overallRiskLevel === 'High' ? 
     'HIGH RISK DETECTED - Exercise extreme caution with this project' : 
     assessmentData.overallRiskLevel === 'Medium' ? 
     'MODERATE RISK DETECTED - Consider limiting exposure if investing' : 
     'FAVORABLE RISK PROFILE - Relatively lower risk compared to typical crypto projects'}

2. ${assessmentData.blockchainRisk?.level === 'High' ? 
     'Address blockchain concerns before investing' : 
     'Monitor blockchain metrics for changes'}

3. ${assessmentData.socialRisk?.level === 'High' ? 
     'Monitor social sentiment closely as it indicates potential issues' : 
     'Community sentiment appears relatively positive'}

4. ${assessmentData.marketRisk?.level === 'High' ? 
     'Market metrics suggest potential instability' : 
     'Market performance shows reasonable stability'}

5. ${assessmentData.dexRisk?.level === 'High' ? 
     'DEX metrics indicate potential liquidity concerns' : 
     'DEX trading conditions appear reasonable'}

6. Always diversify your cryptocurrency investments across multiple projects.

7. Consider setting stop-loss orders or clear exit points before investing.

8. This assessment should be one part of your research process.

-----------------------------------------------------
DISCLAIMER
-----------------------------------------------------
This report was automatically generated by CryptoRiskGuard and is provided for informational purposes only. It does not constitute financial advice, and should not be the sole basis for making investment decisions. Always conduct your own research and consult with a qualified financial advisor before investing in cryptocurrencies.

Cryptocurrency investments are inherently risky and can result in the loss of your entire investment.

© ${new Date().getFullYear()} CryptoRiskGuard
`;
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
    
    // For demonstration purposes, we'll return null to simulate need for mock data
    return null;
  }
  
  /**
   * Add reporting-specific capabilities
   */
  private addReportingCapabilities() {
    const self = this; // Store reference to this instance
    
    // Add capability to generate a report
    this.addCapability({
      name: 'generatePdfReport',
      description: 'Generate a PDF report for a cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The token address, symbol, or name of the project to analyze')
      }),
      async run({ args }) {
        try {
          // Get assessment data
          const assessmentData = await self.getRiskAssessmentData(args.projectIdentifier);
          
          if (!assessmentData) {
            return JSON.stringify({
              error: `No assessment data available for ${args.projectIdentifier}`
            });
          }
          
          // Generate a unique filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${args.projectIdentifier.toLowerCase()}_risk_report_${timestamp}.txt`;
          const filePath = path.join(self.reportsDirectory, filename);
          
          // Format and write the report
          const reportContent = self.formatReportContent(assessmentData);
          fs.writeFileSync(filePath, reportContent);
          
          return JSON.stringify({
            success: true,
            message: `Report generated successfully for ${assessmentData.projectName}`,
            filename,
            path: filePath
          });
        } catch (error) {
          return JSON.stringify({
            error: `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to list available reports
    this.addCapability({
      name: 'listReports',
      description: 'List all available reports',
      schema: z.object({}),
      async run() {
        try {
          // Ensure directory exists
          self.ensureReportsDirectoryExists();
          
          // Read directory contents
          const files = fs.readdirSync(self.reportsDirectory);
          
          // Filter for report files
          const reportFiles = files.filter(file => file.includes('_risk_report_'));
          
          return JSON.stringify({
            count: reportFiles.length,
            reports: reportFiles.map(file => {
              const parts = file.split('_risk_report_');
              const projectIdentifier = parts[0];
              const timestamp = parts[1].replace('.txt', '').replace(/-/g, ':');
              
              return {
                filename: file,
                projectIdentifier,
                generated: timestamp
              };
            })
          });
        } catch (error) {
          return JSON.stringify({
            error: `Error listing reports: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
  }
} 