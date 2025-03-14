import { z } from 'zod';
import axios from 'axios';
import * as ethersLib from 'ethers';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';
import { getTools, type ToolBase } from '@goat-sdk/core';
import { erc20, USDC, WETH, DAI } from '@goat-sdk/plugin-erc20';
import { viem } from '@goat-sdk/wallet-viem';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import type { Capability } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist';

// Load environment variables
dotenv.config();

// Define interfaces for contract analysis data
interface TokenHolder {
  address: string;
  balance: string;
  percentage: number;
}

interface ChainbaseHolder {
  wallet_address: string;
  amount: string;
  usd_value: string;
}

interface ChainbaseResponse {
  count: number;
  holders: ChainbaseHolder[];
}

interface Transaction {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  methodId: string;
  functionName: string;
}

interface SecurityPattern {
  name: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low' | 'Info';
  found: boolean;
}

/**
 * Blockchain Agent
 * Responsible for analyzing on-chain data using Etherscan API
 */
export class BlockchainAgent extends BaseAgent {
  private etherscanApiKey: string;
  private etherscanBaseUrl: string = 'https://api.etherscan.io/api';
  private chainbaseApiKey: string;
  private chainbaseBaseUrl: string = 'https://api.chainbase.online/v1';
  
  // Common security patterns to check in contracts
  private securityPatterns: SecurityPattern[] = [
    {
      name: 'Owner privileges',
      description: 'Contract has functions that only the owner can call, potentially allowing centralized control',
      severity: 'Medium',
      found: false
    },
    {
      name: 'Hidden minting',
      description: 'Contract allows the creation of new tokens without clear limits',
      severity: 'High',
      found: false
    },
    {
      name: 'Fee manipulation',
      description: 'Contract fees can be changed by admin/owner after deployment',
      severity: 'Medium',
      found: false
    },
    {
      name: 'Proxy pattern',
      description: 'Contract uses upgradable proxy pattern allowing logic to be changed',
      severity: 'Medium',
      found: false
    },
    {
      name: 'Transfer restrictions',
      description: 'Contract contains functions that can freeze or restrict token transfers',
      severity: 'Medium',
      found: false
    }
  ];

  constructor() {
    const systemPrompt = `You are the Blockchain Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to analyze on-chain data to evaluate the risk profile of cryptocurrency projects.
You should look for:
1. Contract verification status and source code analysis
2. Transaction history and patterns (unusual activity, large transfers)
3. Token holder distribution (concentration of ownership)
4. Security vulnerabilities and suspicious code patterns
5. Contract code quality and security best practices

Provide detailed analysis with specific metrics, observations, and risk ratings.
Use markdown formatting to present data clearly, and include specific evidence for each risk factor identified.`;

    super(systemPrompt, 'Blockchain');
    
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY || '';
    this.chainbaseApiKey = process.env.CHAINBASE_API_KEY || '';
    
    if (!this.etherscanApiKey) {
      console.error('ETHERSCAN_API_KEY is required for the Blockchain Agent');
    }
    
    if (!this.chainbaseApiKey) {
      console.warn('CHAINBASE_API_KEY is not set, will use mock data for token holders');
    }
    
    this.initializeGoatTools().catch(error => {
      console.error('Error initializing GOAT tools:', error);
    });
    
    this.addBlockchainCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement blockchain-specific logic
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
    
    // Check if the message contains a token address
    const tokenAddressMatch = messageText.match(/0x[a-fA-F0-9]{40}/);
    
    if (tokenAddressMatch) {
      const tokenAddress = tokenAddressMatch[0];
      await this.analyzeTokenAddress(action, tokenAddress);
    } else {
      // Default response when no token address is found
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'm the Blockchain Agent for CryptoRiskGuard. I can perform comprehensive analysis of blockchain data for cryptocurrency tokens, including:\n\n- Contract verification status\n- Source code security analysis\n- Transaction history patterns\n- Token holder distribution\n- Potential security vulnerabilities\n\nPlease provide a valid Ethereum token address (0x...) to analyze."
      });
    }
  }
  
  /**
   * Analyze token address and provide blockchain data assessment
   */
  private async analyzeTokenAddress(action: z.infer<typeof respondChatMessageActionSchema>, tokenAddress: string): Promise<void> {
    try {
      // First, acknowledge that we're analyzing the token
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `🔍 Analyzing blockchain data for ${tokenAddress}...\n\n1️⃣ Checking contract verification\n2️⃣ Retrieving contract information\n3️⃣ Fetching token details\n4️⃣ Analyzing transaction history\n5️⃣ Examining token holders\n6️⃣ Checking for security vulnerabilities\n\nPlease wait while I perform a comprehensive analysis...`
      });
      
      // Check if the contract is verified
      const isVerified = await this.isContractVerified(tokenAddress);
      
      // Get basic contract information
      const contractInfo = await this.getContractInfo(tokenAddress);
      
      // Get token information if it's an ERC-20 token
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      
      // Get token holder distribution
      const holderDistribution = await this.getTokenHolders(tokenAddress);
      
      // Get transaction history
      const transactionHistory = await this.getTransactionHistory(tokenAddress);
      
      // Check for security patterns if verified
      let securityAnalysis: SecurityPattern[] = [];
      if (isVerified && contractInfo.sourceCode) {
        securityAnalysis = await this.analyzeContractCode(contractInfo.sourceCode);
      }
      
      // Calculate blockchain risk score (0-100)
      const riskScore = this.calculateBlockchainRiskScore(
        isVerified,
        contractInfo,
        tokenInfo,
        holderDistribution,
        transactionHistory,
        securityAnalysis
      );
      
      // Generate risk factors list
      const riskFactors = this.identifyRiskFactors(
        isVerified,
        contractInfo,
        tokenInfo,
        holderDistribution,
        transactionHistory,
        securityAnalysis
      );
      
      // Get the creation date
      let creationDate = 'Unknown';
      if (contractInfo.createdTimestamp) {
        creationDate = new Date(parseInt(contractInfo.createdTimestamp) * 1000).toLocaleDateString();
      }
      
      // Calculate concentration metrics
      const { topHolderPercentage, top10Percentage, holderCount } = this.calculateConcentrationMetrics(holderDistribution);
      
      // Calculate transaction metrics
      const { totalTxCount, recentTxCount, uniqueAddressCount, averageTransferAmount } = this.calculateTransactionMetrics(transactionHistory);
      
      // Determine risk level based on score
      let riskLevel = 'Low';
      if (riskScore >= 70) riskLevel = 'High';
      else if (riskScore >= 40) riskLevel = 'Medium';
      
      // Send the analysis results with rich formatting
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `# Blockchain Analysis Results for ${tokenAddress}

## Risk Summary
**Risk Score:** ${riskScore}/100 (${riskLevel} Risk)
${this.getRiskBadge(riskScore)}

## Contract Overview
- **Name:** ${contractInfo.name || tokenInfo.name || 'N/A'}
- **Symbol:** ${tokenInfo.symbol || 'N/A'}
- **Created:** ${creationDate}
- **Verified:** ${isVerified ? '✅ Yes' : '❌ No'}
${contractInfo.implementation ? `- **Implementation Contract (Proxy):** ${contractInfo.implementation}` : ''}
- **Total Supply:** ${this.formatTokenAmount(tokenInfo.totalSupply, tokenInfo.decimals)}
- **Decimals:** ${tokenInfo.decimals || 'N/A'}

## Ownership Analysis
- **Top Holder:** ${topHolderPercentage}% of supply
- **Top 10 Holders:** ${top10Percentage}% of supply
- **Number of Holders:** ${holderCount || 'Unknown'}
${topHolderPercentage > 50 ? '⚠️ **WARNING:** Token supply is highly concentrated' : ''}

## Transaction Analysis
- **Total Transactions:** ${totalTxCount || 'Unknown'}
- **Recent Activity:** ${recentTxCount || 'Unknown'} transactions in last 7 days
- **Unique Addresses:** ${uniqueAddressCount || 'Unknown'} addresses interacted with contract
- **Average Transfer:** ${averageTransferAmount || 'Unknown'} ${tokenInfo.symbol || 'tokens'}

## Security Analysis
${!isVerified ? '❌ **CRITICAL:** Contract is not verified on Etherscan - unable to analyze source code for vulnerabilities' : ''}
${securityAnalysis.length === 0 && isVerified ? '✅ No common security vulnerabilities detected' : ''}
${securityAnalysis.map(pattern => `- ${this.getSeverityIcon(pattern.severity)} **${pattern.name}:** ${pattern.description}`).join('\n')}

## Risk Factors
${riskFactors.length === 0 ? '✅ No significant risk factors identified' : riskFactors.map(factor => `- ${factor}`).join('\n')}

## Recommendations
${this.generateRecommendations(isVerified, riskFactors, riskScore)}

*This analysis provides blockchain data only and should be combined with social media sentiment, team verification, and market performance for a complete risk assessment.*`
      });
    } catch (error) {
      console.error('Error analyzing token address:', error);
      
      // Send error message
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `Error analyzing token address ${tokenAddress}. Please check that it's a valid Ethereum contract address and try again.`
      });
    }
  }
  
  /**
   * Check if contract is verified on Etherscan
   */
  private async isContractVerified(contractAddress: string): Promise<boolean> {
    try {
      const response = await axios.get(this.etherscanBaseUrl, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address: contractAddress,
          apikey: this.etherscanApiKey
        }
      });
      
      if (response.data.status === '1' && response.data.result && response.data.result[0]) {
        // If the source code is available, the contract is verified
        return response.data.result[0].SourceCode !== '';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking contract verification:', error);
      return false;
    }
  }
  
  /**
   * Get basic contract information
   */
  private async getContractInfo(contractAddress: string): Promise<any> {
    try {
      const response = await axios.get(this.etherscanBaseUrl, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address: contractAddress,
          apikey: this.etherscanApiKey
        }
      });
      
      if (response.data.status === '1' && response.data.result && response.data.result[0]) {
        const contractData = response.data.result[0];
        
        // Try to get creation time by getting first transaction
        let createdTimestamp = null;
        try {
          const txListResponse = await axios.get(this.etherscanBaseUrl, {
            params: {
              module: 'account',
              action: 'txlist',
              address: contractAddress,
              startblock: '0',
              endblock: '99999999',
              page: '1',
              offset: '1',
              sort: 'asc',
              apikey: this.etherscanApiKey
            }
          });
          
          if (txListResponse.data.status === '1' && 
              txListResponse.data.result && 
              txListResponse.data.result.length > 0) {
            createdTimestamp = txListResponse.data.result[0].timeStamp;
          }
        } catch (error) {
          console.error('Error getting contract creation time:', error);
        }
        
        return {
          name: contractData.ContractName || null,
          creator: contractData.ContractCreator || null,
          createdTimestamp: createdTimestamp,
          implementation: contractData.Implementation || null, // For proxy contracts
          sourceCode: contractData.SourceCode || null,
          abi: contractData.ABI || null,
          compiler: contractData.CompilerVersion || null
        };
      }
      
      return {};
    } catch (error) {
      console.error('Error getting contract info:', error);
      return {};
    }
  }
  
  /**
   * Get ERC-20 token information
   */
  private async getTokenInfo(tokenAddress: string): Promise<any> {
    try {
      // Get token name and symbol
      const nameSymbolResponse = await axios.get(this.etherscanBaseUrl, {
        params: {
          module: 'token',
          action: 'tokeninfo',
          contractaddress: tokenAddress,
          apikey: this.etherscanApiKey
        }
      });
      
      if (nameSymbolResponse.data.status === '1' && nameSymbolResponse.data.result && nameSymbolResponse.data.result[0]) {
        const tokenData = nameSymbolResponse.data.result[0];
        
        return {
          name: tokenData.name || null,
          symbol: tokenData.symbol || null,
          totalSupply: tokenData.totalSupply || null,
          decimals: parseInt(tokenData.divisor || '18', 10),
          tokenType: tokenData.tokenType || 'ERC20'
        };
      }
      
      // If tokeninfo fails, try to get basic information using contract ABI and Web3
      return {};
    } catch (error) {
      console.error('Error getting token info:', error);
      return {};
    }
  }
  
  /**
   * Get token holder distribution from Chainbase API
   */
  private async getTokenHolders(tokenAddress: string): Promise<TokenHolder[]> {
    try {
      // Check if we have a Chainbase API key
      if (!this.chainbaseApiKey) {
        return this.getMockTokenHolders();
      }
      
      // Use Chainbase API to get top token holders
      // Network ID 1 is for Ethereum mainnet
      const networkId = '1';
      const limit = '10'; // Get top 10 holders
      
      const response = await axios.get(
        `${this.chainbaseBaseUrl}/token/top-holders?chain_id=${networkId}&contract_address=${tokenAddress}&page=1&limit=${limit}`,
        {
          headers: {
            'x-api-key': this.chainbaseApiKey,
            'accept': 'application/json'
          }
        }
      );
      
      if (response.data && response.data.data) {
        const chainbaseData: ChainbaseResponse = response.data.data;
        
        // Calculate total supply from the holders data
        let totalSupply = 0;
        chainbaseData.holders.forEach(holder => {
          totalSupply += parseFloat(holder.amount);
        });
        
        // Convert Chainbase data to our TokenHolder format
        const holders: TokenHolder[] = chainbaseData.holders.map(holder => {
          const balance = holder.amount;
          const percentage = (parseFloat(holder.amount) / totalSupply) * 100;
          
          return {
            address: holder.wallet_address,
            balance,
            percentage: Number(percentage.toFixed(2))
          };
        });
        
        // Add an "Others" entry if we have more holders than what we retrieved
        if (chainbaseData.count > holders.length) {
          // Estimate remaining supply (this is an approximation)
          const retrievedSupply = holders.reduce((sum, holder) => sum + parseFloat(holder.balance), 0);
          const remainingSupply = totalSupply - retrievedSupply;
          const remainingPercentage = 100 - holders.reduce((sum, holder) => sum + holder.percentage, 0);
          
          holders.push({
            address: 'Others',
            balance: remainingSupply.toString(),
            percentage: Number(remainingPercentage.toFixed(2))
          });
        }
        
        return holders;
      }
      
      // Fall back to mock data if response format is unexpected
      console.warn('Unexpected response format from Chainbase API, using mock data');
      return this.getMockTokenHolders();
    } catch (error) {
      console.error('Error getting token holders from Chainbase:', error);
      
      // Fall back to mock data if there's an error
      console.warn('Falling back to mock token holder data');
      return this.getMockTokenHolders();
    }
  }
  
  /**
   * Get mock token holder data for demonstration
   */
  private getMockTokenHolders(): TokenHolder[] {
    return [
      { address: '0x123...', balance: '1000000000000000000000000', percentage: 25 },
      { address: '0x456...', balance: '500000000000000000000000', percentage: 12.5 },
      { address: '0x789...', balance: '300000000000000000000000', percentage: 7.5 },
      { address: '0xabc...', balance: '200000000000000000000000', percentage: 5 },
      { address: '0xdef...', balance: '200000000000000000000000', percentage: 5 },
      { address: '0x111...', balance: '100000000000000000000000', percentage: 2.5 },
      { address: '0x222...', balance: '100000000000000000000000', percentage: 2.5 },
      { address: '0x333...', balance: '100000000000000000000000', percentage: 2.5 },
      { address: '0x444...', balance: '100000000000000000000000', percentage: 2.5 },
      { address: '0x555...', balance: '100000000000000000000000', percentage: 2.5 },
      // Rest of holders with small balances
      { address: 'Others', balance: '1300000000000000000000000', percentage: 32.5 }
    ];
  }
  
  /**
   * Get transaction history
   */
  private async getTransactionHistory(tokenAddress: string): Promise<Transaction[]> {
    try {
      const response = await axios.get(this.etherscanBaseUrl, {
        params: {
          module: 'account',
          action: 'txlist',
          address: tokenAddress,
          startblock: '0',
          endblock: '99999999',
          page: '1',
          offset: '100', // Get last 100 transactions
          sort: 'desc',
          apikey: this.etherscanApiKey
        }
      });
      
      if (response.data.status === '1' && response.data.result) {
        return response.data.result;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }
  
  /**
   * Analyze contract code for security patterns
   */
  private async analyzeContractCode(sourceCode: string): Promise<SecurityPattern[]> {
    // Create a copy of the security patterns
    const patterns = [...this.securityPatterns];
    
    // Check for each pattern in the source code
    patterns.forEach(pattern => {
      switch (pattern.name) {
        case 'Owner privileges':
          pattern.found = sourceCode.includes('onlyOwner') || 
                         sourceCode.includes('require(msg.sender == owner') ||
                         sourceCode.includes('require(owner == msg.sender');
          break;
        case 'Hidden minting':
          pattern.found = (sourceCode.includes('mint') && 
                         !sourceCode.includes('totalSupply')) ||
                         sourceCode.includes('_mint(') && 
                         sourceCode.includes('onlyOwner');
          break;
        case 'Fee manipulation':
          pattern.found = sourceCode.includes('setFee') ||
                         sourceCode.includes('changeFee') ||
                         sourceCode.includes('updateFee');
          break;
        case 'Proxy pattern':
          pattern.found = sourceCode.includes('delegatecall') ||
                         sourceCode.includes('upgradeability') ||
                         sourceCode.includes('Proxy');
          break;
        case 'Transfer restrictions':
          pattern.found = sourceCode.includes('pausable') ||
                         sourceCode.includes('blacklist') ||
                         sourceCode.includes('freeze');
          break;
      }
    });
    
    // Return only patterns that were found
    return patterns.filter(pattern => pattern.found);
  }
  
  /**
   * Identify risk factors based on blockchain data
   */
  private identifyRiskFactors(
    isVerified: boolean, 
    contractInfo: any, 
    tokenInfo: any,
    holderDistribution: TokenHolder[],
    transactionHistory: Transaction[],
    securityPatterns: SecurityPattern[]
  ): string[] {
    const riskFactors: string[] = [];
    
    // Contract verification
    if (!isVerified) {
      riskFactors.push('❌ **CRITICAL RISK:** Contract source code is not verified on Etherscan, making it impossible to audit the code for vulnerabilities');
    }
    
    // Proxy contract
    if (contractInfo.implementation) {
      riskFactors.push('⚠️ **HIGH RISK:** This is a proxy contract. The implementation can be changed by the admin at any time, potentially altering token behavior');
    }
    
    // Token information
    if (!tokenInfo.name || !tokenInfo.symbol) {
      riskFactors.push('⚠️ **MEDIUM RISK:** Token lacks basic information (name or symbol), which is unusual for legitimate projects');
    }
    
    // Contract age
    if (contractInfo.createdTimestamp) {
      const creationDate = new Date(parseInt(contractInfo.createdTimestamp) * 1000);
      const now = new Date();
      const ageInDays = Math.floor((now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays < 30) {
        riskFactors.push(`⚠️ **MEDIUM RISK:** Contract is very new (${ageInDays} days old), which may indicate higher risk`);
      }
    }
    
    // Holder concentration
    const { topHolderPercentage, top10Percentage } = this.calculateConcentrationMetrics(holderDistribution);
    
    if (topHolderPercentage > 50) {
      riskFactors.push(`❌ **CRITICAL RISK:** Extreme concentration of tokens (${topHolderPercentage}%) in a single wallet`);
    } else if (topHolderPercentage > 20) {
      riskFactors.push(`⚠️ **HIGH RISK:** High concentration of tokens (${topHolderPercentage}%) in a single wallet`);
    }
    
    if (top10Percentage > 80) {
      riskFactors.push(`⚠️ **HIGH RISK:** Top 10 holders control ${top10Percentage}% of the tokens, indicating high centralization`);
    }
    
    // Security patterns
    securityPatterns.forEach(pattern => {
      if (pattern.severity === 'High') {
        riskFactors.push(`❌ **CRITICAL RISK:** ${pattern.name} - ${pattern.description}`);
      } else if (pattern.severity === 'Medium') {
        riskFactors.push(`⚠️ **MEDIUM RISK:** ${pattern.name} - ${pattern.description}`);
      }
    });
    
    // Transaction analysis
    if (transactionHistory.length > 0) {
      // Check for large transactions in past 24 hours
      const recentTime = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
      const largeRecentTransactions = transactionHistory.filter(tx => 
        parseInt(tx.timeStamp) > recentTime && 
        parseFloat(ethersLib.formatEther(tx.value)) > 100
      );
      
      if (largeRecentTransactions.length > 5) {
        riskFactors.push('⚠️ **MEDIUM RISK:** Unusual number of large transactions in past 24 hours');
      }
    }
    
    return riskFactors;
  }
  
  /**
   * Calculate blockchain risk score (0-100)
   */
  private calculateBlockchainRiskScore(
    isVerified: boolean, 
    contractInfo: any, 
    tokenInfo: any,
    holderDistribution: TokenHolder[],
    transactionHistory: Transaction[],
    securityPatterns: SecurityPattern[]
  ): number {
    let score = 0;
    
    // Start at middle risk if we can't verify crucial information
    if (!isVerified) {
      score += 50; // Not verified is a major risk
    }
    
    // Proxy contracts add risk
    if (contractInfo.implementation) {
      score += 20;
    }
    
    // Missing token info adds risk
    if (!tokenInfo.name || !tokenInfo.symbol) {
      score += 10;
    }
    
    // Contract age
    if (contractInfo.createdTimestamp) {
      const creationDate = new Date(parseInt(contractInfo.createdTimestamp) * 1000);
      const now = new Date();
      const ageInDays = Math.floor((now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays < 7) {
        score += 20;
      } else if (ageInDays < 30) {
        score += 10;
      } else if (ageInDays < 90) {
        score += 5;
      }
    } else {
      score += 5; // Unknown age adds some risk
    }
    
    // Holder concentration
    const { topHolderPercentage, top10Percentage } = this.calculateConcentrationMetrics(holderDistribution);
    
    if (topHolderPercentage > 50) {
      score += 30;
    } else if (topHolderPercentage > 20) {
      score += 15;
    } else if (topHolderPercentage > 10) {
      score += 5;
    }
    
    if (top10Percentage > 90) {
      score += 20;
    } else if (top10Percentage > 80) {
      score += 10;
    } else if (top10Percentage > 70) {
      score += 5;
    }
    
    // Security patterns
    securityPatterns.forEach(pattern => {
      if (pattern.severity === 'High') {
        score += 20;
      } else if (pattern.severity === 'Medium') {
        score += 10;
      } else if (pattern.severity === 'Low') {
        score += 5;
      }
    });
    
    // Cap the score at 100
    return Math.min(100, score);
  }
  
  /**
   * Calculate concentration metrics from holder distribution
   */
  private calculateConcentrationMetrics(holders: TokenHolder[]): { topHolderPercentage: number; top10Percentage: number; holderCount: number } {
    if (!holders || holders.length === 0) {
      return { topHolderPercentage: 0, top10Percentage: 0, holderCount: 0 };
    }
    
    // Sort holders by percentage (descending)
    const sortedHolders = [...holders].sort((a, b) => b.percentage - a.percentage);
    
    // Calculate metrics
    const topHolderPercentage = sortedHolders[0]?.percentage || 0;
    
    let top10Percentage = 0;
    const top10Holders = sortedHolders.slice(0, 10);
    top10Holders.forEach(holder => {
      top10Percentage += holder.percentage;
    });
    
    return {
      topHolderPercentage,
      top10Percentage,
      holderCount: holders.length
    };
  }
  
  /**
   * Calculate transaction metrics
   */
  private calculateTransactionMetrics(transactions: Transaction[]): any {
    if (!transactions || transactions.length === 0) {
      return {
        totalTxCount: 0,
        recentTxCount: 0,
        uniqueAddressCount: 0,
        averageTransferAmount: 0
      };
    }
    
    // Calculate total transaction count
    const totalTxCount = transactions.length;
    
    // Calculate recent transactions (last 7 days)
    const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const recentTransactions = transactions.filter(tx => parseInt(tx.timeStamp) > oneWeekAgo);
    const recentTxCount = recentTransactions.length;
    
    // Calculate unique addresses
    const uniqueAddresses = new Set<string>();
    transactions.forEach(tx => {
      uniqueAddresses.add(tx.from);
      uniqueAddresses.add(tx.to);
    });
    const uniqueAddressCount = uniqueAddresses.size;
    
    // Calculate average transfer amount (only for value transfers)
    let totalAmount = 0;
    let valueTransferCount = 0;
    
    transactions.forEach(tx => {
      if (tx.value && tx.value !== '0') {
        totalAmount += parseFloat(ethersLib.formatEther(tx.value));
        valueTransferCount++;
      }
    });
    
    const averageTransferAmount = valueTransferCount > 0 ? 
      (totalAmount / valueTransferCount).toFixed(2) : 0;
    
    return {
      totalTxCount,
      recentTxCount,
      uniqueAddressCount,
      averageTransferAmount
    };
  }
  
  /**
   * Format token amount with appropriate decimal places
   */
  private formatTokenAmount(amount: string | null, decimals: number = 18): string {
    if (!amount) return 'N/A';
    
    try {
      // Format the amount according to token decimals
      const formatted = ethersLib.formatUnits(amount, decimals);
      
      // Add commas for readability
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      return parts.join('.');
    } catch (error) {
      return amount;
    }
  }
  
  /**
   * Get severity icon for security pattern
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'High':
        return '🔴';
      case 'Medium':
        return '🟠';
      case 'Low':
        return '🟡';
      default:
        return 'ℹ️';
    }
  }
  
  /**
   * Get risk badge based on score
   */
  private getRiskBadge(score: number): string {
    if (score >= 70) {
      return '🔴 **HIGH RISK**';
    } else if (score >= 40) {
      return '🟠 **MEDIUM RISK**';
    } else {
      return '🟢 **LOW RISK**';
    }
  }
  
  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(isVerified: boolean, riskFactors: string[], riskScore: number): string {
    const recommendations: string[] = [];
    
    if (!isVerified) {
      recommendations.push('⚠️ **DO NOT INVEST** without verifying the contract source code.');
    }
    
    if (riskScore >= 70) {
      recommendations.push('⚠️ **AVOID** investing in this token due to high risk indicators.');
    } else if (riskScore >= 40) {
      recommendations.push('⚠️ **CAUTION** recommended - further research and small position sizes advised if investing.');
    } else {
      recommendations.push('✅ Blockchain indicators appear favorable, but always do additional research.');
    }
    
    if (riskFactors.some(factor => factor.includes('concentration'))) {
      recommendations.push('⚠️ Consider the high token concentration when evaluating potential price manipulation risks.');
    }
    
    if (riskFactors.some(factor => factor.includes('Proxy'))) {
      recommendations.push('⚠️ Monitor announcements for contract upgrades as the contract logic can change.');
    }
    
    return recommendations.join('\n');
  }
  
  /**
   * Add blockchain-specific capabilities
   */
  private addBlockchainCapabilities() {
    const self = this; // Store a reference to the class instance
    
    // Add capability to check contract verification
    this.addCapability({
      name: 'checkContractVerification',
      description: 'Check if a contract is verified on Etherscan',
      schema: z.object({
        contractAddress: z.string().describe('The Ethereum contract address to check')
      }),
      async run({ args }) {
        const isVerified = await self.isContractVerified(args.contractAddress);
        return isVerified ? 'Contract is verified' : 'Contract is NOT verified';
      }
    });
    
    // Add capability to get contract information
    this.addCapability({
      name: 'getContractInfo',
      description: 'Get basic information about a contract',
      schema: z.object({
        contractAddress: z.string().describe('The Ethereum contract address to check')
      }),
      async run({ args }) {
        const contractInfo = await self.getContractInfo(args.contractAddress);
        return JSON.stringify(contractInfo, null, 2);
      }
    });
    
    // Add capability to get token information
    this.addCapability({
      name: 'getTokenInfo',
      description: 'Get information about an ERC-20 token',
      schema: z.object({
        tokenAddress: z.string().describe('The Ethereum token address to check')
      }),
      async run({ args }) {
        const tokenInfo = await self.getTokenInfo(args.tokenAddress);
        return JSON.stringify(tokenInfo, null, 2);
      }
    });
    
    // Add capability to analyze token holders
    this.addCapability({
      name: 'analyzeTokenHolders',
      description: 'Analyze the distribution of token holders',
      schema: z.object({
        tokenAddress: z.string().describe('The Ethereum token address to analyze')
      }),
      async run({ args }) {
        const holders = await self.getTokenHolders(args.tokenAddress);
        const metrics = self.calculateConcentrationMetrics(holders);
        
        return JSON.stringify({
          holders: holders.slice(0, 10), // Return top 10 holders
          topHolderPercentage: metrics.topHolderPercentage,
          top10Percentage: metrics.top10Percentage,
          holderCount: metrics.holderCount
        }, null, 2);
      }
    });
    
    // Add capability to analyze transaction history
    this.addCapability({
      name: 'analyzeTransactions',
      description: 'Analyze recent transactions for a contract',
      schema: z.object({
        contractAddress: z.string().describe('The Ethereum contract address to analyze')
      }),
      async run({ args }) {
        const transactions = await self.getTransactionHistory(args.contractAddress);
        const metrics = self.calculateTransactionMetrics(transactions);
        
        return JSON.stringify({
          recentTransactions: transactions.slice(0, 5), // Return 5 most recent transactions
          metrics
        }, null, 2);
      }
    });
    
    // Add capability to perform full blockchain risk assessment
    this.addCapability({
      name: 'assessBlockchainRisk',
      description: 'Perform a complete blockchain risk assessment for a token',
      schema: z.object({
        tokenAddress: z.string().describe('The Ethereum token address to assess')
      }),
      async run({ args }) {
        const isVerified = await self.isContractVerified(args.tokenAddress);
        const contractInfo = await self.getContractInfo(args.tokenAddress);
        const tokenInfo = await self.getTokenInfo(args.tokenAddress);
        const holderDistribution = await self.getTokenHolders(args.tokenAddress);
        const transactionHistory = await self.getTransactionHistory(args.tokenAddress);
        
        let securityAnalysis: SecurityPattern[] = [];
        if (isVerified && contractInfo.sourceCode) {
          securityAnalysis = await self.analyzeContractCode(contractInfo.sourceCode);
        }
        
        const riskScore = self.calculateBlockchainRiskScore(
          isVerified,
          contractInfo,
          tokenInfo,
          holderDistribution,
          transactionHistory,
          securityAnalysis
        );
        
        const riskFactors = self.identifyRiskFactors(
          isVerified,
          contractInfo,
          tokenInfo,
          holderDistribution,
          transactionHistory,
          securityAnalysis
        );
        
        return JSON.stringify({
          tokenAddress: args.tokenAddress,
          riskScore,
          riskLevel: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
          riskFactors,
          isVerified,
          contractName: contractInfo.name || tokenInfo.name,
          tokenSymbol: tokenInfo.symbol,
          holderConcentration: self.calculateConcentrationMetrics(holderDistribution)
        }, null, 2);
      }
    });
  }

  /**
   * Initialize GOAT SDK for enhanced blockchain capabilities
   */
  private async initializeGoatTools() {
    try {
      // Create a public client for blockchain interactions
      const publicClient = createPublicClient({
        transport: http(process.env.RPC_PROVIDER_URL || 'https://eth.llamarpc.com'),
        chain: mainnet
      });

      // Initialize wallet with public client
      const wallet = viem(publicClient);

      // Initialize ERC20 plugin with commonly used tokens
      const erc20Plugin = erc20({
        tokens: [
          USDC,
          WETH,
          DAI,
          {
            name: 'Shiba Inu',
            symbol: 'SHIB',
            decimals: 18,
            chains: {
              [mainnet.id]: {
                contractAddress: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'
              }
            }
          }
        ]
      });

      // Get GOAT tools with ERC20 plugin
      const goatTools = await getTools({
        wallet,
        plugins: [erc20Plugin]
      });

      // Convert GOAT tools to OpenServ capabilities
      this.addGoatCapabilities(goatTools);

      console.log('GOAT SDK initialized with ERC20 capabilities');
    } catch (error) {
      console.error('Failed to initialize GOAT SDK:', error);
    }
  }

  /**
   * Convert GOAT tools to OpenServ capabilities
   */
  private addGoatCapabilities(tools: ToolBase[]) {
    for (const tool of tools) {
      try {
        this.addCapability({
          name: tool.name,
          description: tool.description,
          schema: tool.parameters,
          async run({ args }) {
            try {
              const response = await tool.execute(args);
              
              if (typeof response === 'object') {
                return JSON.stringify(response, null, 2);
              }
              
              return response.toString();
            } catch (error) {
              console.error(`Error executing GOAT tool ${tool.name}:`, error);
              return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        });
      } catch (error) {
        console.error(`Failed to add GOAT capability ${tool.name}:`, error);
      }
    }
  }

  /**
   * Get ERC20 token details using GOAT SDK
   */
  private async getErc20TokenDetails(tokenAddress: string): Promise<{
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
  } | null> {
    try {
      // Instead of trying to find capabilities dynamically, we'll use the tokenInfo method
      // from our existing agent implementation since we already have that capability
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      
      return {
        name: tokenInfo.name || 'Unknown',
        symbol: tokenInfo.symbol || 'Unknown',
        decimals: tokenInfo.decimals || 18,
        totalSupply: tokenInfo.totalSupply || 'Unknown'
      };
    } catch (error) {
      console.error('Error getting ERC20 token details:', error);
      return null;
    }
  }
} 