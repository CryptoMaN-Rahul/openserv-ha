import dotenv from 'dotenv';
import { CoordinatorAgent } from './agents/coordinator/coordinator-agent';
import { BlockchainAgent } from './agents/blockchain/blockchain-agent';
import { SocialMediaAgent } from './agents/social/social-agent';
import { MarketAnalysisAgent } from './agents/market/market-agent';
import { DexScreenerAgent } from './agents/dexscreener';
import { AnalysisAgent } from './agents/analysis';
import { ReportingAgent } from './agents/reporting';

// Load environment variables
dotenv.config();

// Check for required API keys
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is required in .env file');
  process.exit(1);
}

if (!process.env.ETHERSCAN_API_KEY) {
  console.error('ETHERSCAN_API_KEY is required in .env file for Blockchain Agent');
  process.exit(1);
}

if (!process.env.TWITTER_BEARER_TOKEN) {
  console.warn('TWITTER_BEARER_TOKEN is not set in .env file. Social Media Agent will not be able to access Twitter API.');
}

if (!process.env.COINGECKO_API_KEY) {
  console.warn('COINGECKO_API_KEY is not set in .env file. Market Analysis Agent will use free tier with rate limits.');
}

console.log('Starting CryptoRiskGuard Agents...');

// Create and start the Coordinator Agent
const coordinatorAgent = new CoordinatorAgent();
coordinatorAgent.start();

// Create and start the Blockchain Agent
const blockchainAgent = new BlockchainAgent();
blockchainAgent.start();

// Create and start the Social Media Agent
const socialMediaAgent = new SocialMediaAgent();
socialMediaAgent.start();

// Create and start the Market Analysis Agent
const marketAnalysisAgent = new MarketAnalysisAgent();
marketAnalysisAgent.start();

// Create and start the Analysis Agent
const analysisAgent = new AnalysisAgent();
analysisAgent.start();

// Create and start the Reporting Agent
const reportingAgent = new ReportingAgent();
reportingAgent.start();

console.log('Agents started successfully!');

// Local testing function
async function testAgents() {
  try {
    console.log('Testing Coordinator Agent...');
    
    // Test case 1: General inquiry to coordinator
    const test1 = await coordinatorAgent.process({
      messages: [{ role: 'user', content: 'What can you do?' }]
    });
    console.log('Coordinator Test 1 Response:', test1.choices[0].message.content);
    
    // Test case 2: Risk assessment request to coordinator
    const test2 = await coordinatorAgent.process({
      messages: [{ role: 'user', content: 'I need a risk assessment for Ethereum' }]
    });
    console.log('Coordinator Test 2 Response:', test2.choices[0].message.content);
    
    console.log('\nTesting Blockchain Agent...');
    
    // Test case 1: General inquiry to blockchain agent
    const blockchainTest1 = await blockchainAgent.process({
      messages: [{ role: 'user', content: 'What can you do?' }]
    });
    console.log('Blockchain Test 1 Response:', blockchainTest1.choices[0].message.content);
    
    // Test case 2: Analyze a token address with blockchain agent
    // Using USDC contract address as an example
    const blockchainTest2 = await blockchainAgent.process({
      messages: [{ role: 'user', content: 'Analyze the token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }]
    });
    console.log('Blockchain Test 2 Response:', blockchainTest2.choices[0].message.content);
    
    console.log('\nTesting Social Media Agent...');
    
    // Test case 1: General inquiry to social media agent
    const socialTest1 = await socialMediaAgent.process({
      messages: [{ role: 'user', content: 'What can you do?' }]
    });
    console.log('Social Media Test 1 Response:', socialTest1.choices[0].message.content);
    
    // Test case 2: Analyze sentiment for a project
    const socialTest2 = await socialMediaAgent.process({
      messages: [{ role: 'user', content: 'Check the sentiment for Bitcoin' }]
    });
    console.log('Social Media Test 2 Response:', socialTest2.choices[0].message.content);
    
    console.log('\nTesting Market Analysis Agent...');
    
    // Test case 1: General inquiry to market analysis agent
    const marketTest1 = await marketAnalysisAgent.process({
      messages: [{ role: 'user', content: 'What can you do?' }]
    });
    console.log('Market Analysis Test 1 Response:', marketTest1.choices[0].message.content);
    
    // Test case 2: Analyze market data for a project
    const marketTest2 = await marketAnalysisAgent.process({
      messages: [{ role: 'user', content: 'Check market data for Bitcoin' }]
    });
    console.log('Market Analysis Test 2 Response:', marketTest2.choices[0].message.content);
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run tests in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development mode - executing tests...');
  testAgents().catch(console.error);
}

// Export all agents
export {
  coordinatorAgent,
  blockchainAgent,
  socialMediaAgent,
  marketAnalysisAgent,
  DexScreenerAgent,
  AnalysisAgent,
  ReportingAgent,
};
