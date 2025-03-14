import { z } from 'zod';
import axios from 'axios';
import { BaseAgent } from '../base-agent';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces for Twitter data
interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  verified: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  author_id: string;
}

interface TwitterSentimentAnalysis {
  tweet: TwitterTweet;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
}

interface TwitterRiskAssessment {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  overallSentimentScore: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  redFlags: string[];
  positiveIndicators: string[];
  tweetCount: number;
  recentTweets: TwitterSentimentAnalysis[];
  userInfo?: TwitterUser;
  tweetFrequency: number; // tweets per day
  engagementRate: number; // avg likes+retweets+replies per tweet
  sentimentBreakdown: {
    positive: number; // percentage
    neutral: number;  // percentage
    negative: number; // percentage
  };
}

/**
 * Social Media Agent
 * Responsible for analyzing Twitter sentiment for cryptocurrency projects
 */
export class SocialMediaAgent extends BaseAgent {
  private twitterBearerToken: string;
  private twitterApiBaseUrl: string = 'https://api.twitter.com';
  
  constructor() {
    const systemPrompt = `You are the Social Media Agent for CryptoRiskGuard, an AI-powered system for cryptocurrency risk assessment.
Your role is to analyze Twitter sentiment to evaluate the risk profile of cryptocurrency projects.
You should look for:
1. Overall sentiment on Twitter/X
2. Community size and engagement metrics
3. Frequency and content of official project communications
4. Red flags such as spam, bot activity, or coordinated pumping
5. Influencer involvement and promotional patterns

Provide detailed analysis with specific metrics, observations, and risk ratings.
Use markdown formatting to present data clearly, and include specific evidence for each risk factor identified.`;

    super(systemPrompt, 'Social Media');
    
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    
    if (!this.twitterBearerToken) {
      console.warn('TWITTER_BEARER_TOKEN is not set in .env file. Twitter API features will not work.');
    }
    
    this.addSocialMediaCapabilities();
  }
  
  /**
   * Override the respondToChat method to implement social media-specific logic
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
    
    // Check if the message contains a project name or token address
    const projectMatch = this.extractProjectIdentifier(messageText);
    
    if (projectMatch) {
      await this.analyzeTwitterSentiment(action, projectMatch);
    } else {
      // Default response when no project identifier is found
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: "I'm the Social Media Agent for CryptoRiskGuard. I can analyze Twitter sentiment and community engagement for cryptocurrency projects. Please provide a project name or token address to analyze (e.g., 'Check sentiment for Bitcoin' or 'Analyze 0x...')."
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
    
    // Look for project names using common patterns in user requests
    const projectPatterns = [
      /analyze\s+([a-zA-Z0-9]+)/i,
      /check\s+([a-zA-Z0-9]+)/i,
      /sentiment\s+for\s+([a-zA-Z0-9]+)/i,
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
   * Analyze Twitter sentiment for a project
   */
  private async analyzeTwitterSentiment(action: z.infer<typeof respondChatMessageActionSchema>, projectIdentifier: string): Promise<void> {
    try {
      // First, acknowledge that we're analyzing the project
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `🔍 Analyzing Twitter sentiment for ${projectIdentifier}...\n\n1️⃣ Searching for related tweets\n2️⃣ Analyzing sentiment patterns\n3️⃣ Evaluating engagement metrics\n4️⃣ Checking project's official Twitter account\n\nPlease wait while I gather and analyze Twitter data...`
      });
      
      if (!this.twitterBearerToken) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `⚠️ Cannot perform Twitter analysis: TWITTER_BEARER_TOKEN is not set in the environment variables. Please add your Twitter API credentials to the .env file to use this feature.`
        });
        return;
      }
      
      // Try to get the official Twitter account if it's a known project
      let projectTwitterHandle = await this.findProjectTwitterHandle(projectIdentifier);
      
      // Get tweets related to the project
      const relatedTweets = await this.searchTweets(projectIdentifier);
      
      if (relatedTweets.length === 0) {
        this.sendChatMessage({
          workspaceId: action.workspace.id,
          agentId: action.me.id,
          message: `I couldn't find any tweets related to ${projectIdentifier}. Please check if the project name is correct or try another search term.`
        });
        return;
      }
      
      // Analyze tweet sentiment using LLM
      const tweetSentiments = await this.analyzeTweetSentimentsWithLLM(relatedTweets);
      
      // Get project's Twitter account info if we found the handle
      let projectTwitterInfo: TwitterUser | undefined;
      if (projectTwitterHandle) {
        projectTwitterInfo = await this.getTwitterUserInfo(projectTwitterHandle);
      }
      
      // Calculate overall assessment
      const assessment = this.calculateTwitterRiskAssessment(
        tweetSentiments, 
        projectTwitterInfo
      );
      
      // Send the analysis results with rich formatting
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: this.formatTwitterAnalysisReport(projectIdentifier, assessment)
      });
    } catch (error) {
      console.error('Error analyzing Twitter sentiment:', error);
      
      // Send error message
      this.sendChatMessage({
        workspaceId: action.workspace.id,
        agentId: action.me.id,
        message: `Error analyzing Twitter sentiment for ${projectIdentifier}. ${error instanceof Error ? error.message : 'Please try again later.'}`
      });
    }
  }
  
  /**
   * Find Twitter handle for a known cryptocurrency project
   */
  private async findProjectTwitterHandle(projectIdentifier: string): Promise<string | null> {
    // Map of common crypto projects to their official Twitter handles
    const knownProjects: Record<string, string> = {
      'bitcoin': 'Bitcoin',
      'btc': 'Bitcoin',
      'ethereum': 'ethereum',
      'eth': 'ethereum',
      'bnb': 'binance',
      'binance': 'binance',
      'solana': 'solana',
      'sol': 'solana',
      'cardano': 'Cardano',
      'ada': 'Cardano',
      'ripple': 'Ripple',
      'xrp': 'Ripple',
      'dogecoin': 'dogecoin',
      'doge': 'dogecoin',
      'polkadot': 'Polkadot',
      'dot': 'Polkadot',
      'avalanche': 'avalancheavax',
      'avax': 'avalancheavax',
      'shiba': 'ShibaInuCoin',
      'shib': 'ShibaInuCoin',
      'litecoin': 'litecoin',
      'ltc': 'litecoin',
      'polygon': 'OfficialPolygon',
      'matic': 'OfficialPolygon',
      'chainlink': 'chainlink',
      'link': 'chainlink',
      'uniswap': 'Uniswap',
      'uni': 'Uniswap',
      'aave': 'aave',
      'tron': 'Tronfoundation',
      'trx': 'Tronfoundation'
    };
    
    const normalizedProject = projectIdentifier.toLowerCase();
    return knownProjects[normalizedProject] || null;
  }
  
  /**
   * Search for tweets related to a project
   */
  private async searchTweets(query: string): Promise<TwitterTweet[]> {
    try {
      // Prepare search query - focus on crypto topics
      const searchQuery = `${query} crypto -is:retweet`;
      
      // Make API call to Twitter Search API
      const response = await axios.get(`${this.twitterApiBaseUrl}/2/tweets/search/recent`, {
        headers: {
          'Authorization': `Bearer ${this.twitterBearerToken}`
        },
        params: {
          'query': searchQuery,
          'max_results': 100,
          'tweet.fields': 'created_at,public_metrics,author_id',
          'expansions': 'author_id',
          'user.fields': 'username,public_metrics,verified'
        }
      });
      
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error searching Twitter:', error);
      return [];
    }
  }
  
  /**
   * Get information about a Twitter user
   */
  private async getTwitterUserInfo(username: string): Promise<TwitterUser | undefined> {
    try {
      const response = await axios.get(`${this.twitterApiBaseUrl}/2/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${this.twitterBearerToken}`
        },
        params: {
          'user.fields': 'public_metrics,verified,profile_image_url'
        }
      });
      
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting Twitter user info:', error);
      return undefined;
    }
  }
  
  /**
   * Analyze sentiments of tweets using the Gemini LLM
   * This replaces the dictionary-based approach with a more sophisticated LLM analysis
   */
  private async analyzeTweetSentimentsWithLLM(tweets: TwitterTweet[]): Promise<TwitterSentimentAnalysis[]> {
    // Limit the number of tweets to analyze to avoid rate limits
    const tweetsToAnalyze = tweets.slice(0, 20); // Analyze at most 20 tweets
    const results: TwitterSentimentAnalysis[] = [];
    
    // Process tweets in batches to avoid overwhelming the LLM
    const batchSize = 4;
    for (let i = 0; i < tweetsToAnalyze.length; i += batchSize) {
      const batch = tweetsToAnalyze.slice(i, i + batchSize);
      
      try {
        // Create a batch analysis promise
        const batchResults = await this.analyzeTweetBatch(batch);
        results.push(...batchResults);
      } catch (error) {
        console.error('Error analyzing tweet batch with LLM:', error);
        // Use a fallback neutral sentiment for tweets that couldn't be analyzed
        batch.forEach(tweet => {
          results.push({
            tweet,
            sentiment: 'neutral',
            sentimentScore: 0
          });
        });
      }
    }
    
    return results;
  }
  
  /**
   * Analyze a batch of tweets with the Gemini LLM
   */
  private async analyzeTweetBatch(tweets: TwitterTweet[]): Promise<TwitterSentimentAnalysis[]> {
    // Create a prompt for the LLM
    const prompt = `
Analyze the sentiment of the following cryptocurrency-related tweets and classify each one as positive, neutral, or negative.
For each tweet, provide:
1. A sentiment label (positive, neutral, or negative)
2. A sentiment score from -1.0 (very negative) to 1.0 (very positive), with 0.0 being neutral
3. A brief explanation of why you chose that sentiment

Format your response as a JSON array of objects with the following structure:
[
  {
    "index": 0,
    "sentiment": "positive|neutral|negative",
    "score": number between -1.0 and 1.0,
    "explanation": "brief explanation"
  },
  ...
]

Tweets to analyze:
${tweets.map((tweet, index) => `[${index}] "${tweet.text}"`).join('\n\n')}
`;

    // Use the LLM (using our process method which uses Gemini)
    const response = await this.process({
      messages: [{ role: 'user', content: prompt }]
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from LLM');
    }
    
    const content = response.choices[0].message.content;
    
    // Extract the JSON from the response
    let jsonMatch = content && (content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/));
    if (!jsonMatch && content) {
      // Try to find JSON without code blocks
      jsonMatch = content && content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    }
    
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const jsonString = jsonMatch[1] || jsonMatch[0];
    
    try {
      const sentiments = JSON.parse(jsonString);
      
      // Map the LLM results to TwitterSentimentAnalysis objects
      return tweets.map((tweet, index) => {
        const sentiment = sentiments.find((s: any) => s.index === index) || { sentiment: 'neutral', score: 0 };
        return {
          tweet,
          sentiment: sentiment.sentiment as 'positive' | 'neutral' | 'negative',
          sentimentScore: sentiment.score
        };
      });
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse sentiment analysis results');
    }
  }
  
  /**
   * Calculate risk assessment from Twitter data
   */
  private calculateTwitterRiskAssessment(
    tweetSentiments: TwitterSentimentAnalysis[],
    userInfo?: TwitterUser
  ): TwitterRiskAssessment {
    if (tweetSentiments.length === 0) {
      // Default neutral assessment if no tweets were found
      return {
        overallSentiment: 'neutral',
        overallSentimentScore: 0,
        riskScore: 50,
        riskLevel: 'Medium',
        redFlags: ['No recent Twitter activity found'],
        positiveIndicators: [],
        tweetCount: 0,
        recentTweets: [],
        userInfo,
        tweetFrequency: 0,
        engagementRate: 0,
        sentimentBreakdown: {
          positive: 0,
          neutral: 100,
          negative: 0
        }
      };
    }
    
    // Calculate overall sentiment score (average of all tweets)
    const totalSentimentScore = tweetSentiments.reduce(
      (sum, item) => sum + item.sentimentScore, 0
    );
    const overallSentimentScore = totalSentimentScore / tweetSentiments.length;
    
    // Determine sentiment category
    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (overallSentimentScore > 0.1) overallSentiment = 'positive';
    if (overallSentimentScore < -0.1) overallSentiment = 'negative';
    
    // Calculate risk score (0-100)
    // Higher sentiment = lower risk
    const riskScore = Math.round(((1 - overallSentimentScore) / 2) * 100);
    
    // Determine risk level
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    if (riskScore < 40) riskLevel = 'Low';
    if (riskScore > 70) riskLevel = 'High';
    
    // Calculate sentiment breakdown
    const positiveTweets = tweetSentiments.filter(t => t.sentiment === 'positive').length;
    const negativeTweets = tweetSentiments.filter(t => t.sentiment === 'negative').length;
    const neutralTweets = tweetSentiments.length - positiveTweets - negativeTweets;
    
    const sentimentBreakdown = {
      positive: Math.round((positiveTweets / tweetSentiments.length) * 100),
      neutral: Math.round((neutralTweets / tweetSentiments.length) * 100),
      negative: Math.round((negativeTweets / tweetSentiments.length) * 100)
    };
    
    // Calculate tweet frequency (tweets per day)
    // For simplicity, using the most recent 100 tweets
    const tweetFrequency = tweetSentiments.length;
    
    // Calculate engagement rate
    const totalLikes = tweetSentiments.reduce(
      (sum, item) => sum + item.tweet.public_metrics.like_count, 0
    );
    const totalRetweets = tweetSentiments.reduce(
      (sum, item) => sum + item.tweet.public_metrics.retweet_count, 0
    );
    const totalReplies = tweetSentiments.reduce(
      (sum, item) => sum + item.tweet.public_metrics.reply_count, 0
    );
    
    const engagementRate = tweetSentiments.length > 0 ?
      (totalLikes + totalRetweets + totalReplies) / tweetSentiments.length : 0;
    
    // Identify red flags and positive indicators
    const redFlags = [];
    const positiveIndicators = [];
    
    // Red flags based on sentiment
    if (sentimentBreakdown.negative > 50) {
      redFlags.push('Majority negative sentiment on Twitter');
    }
    
    // Red flags based on tweet patterns
    if (tweetSentiments.length < 10) {
      redFlags.push('Very low Twitter discussion volume');
    }
    
    // Red flags based on engagement
    if (engagementRate < 1) {
      redFlags.push('Low engagement with tweets about this project');
    }
    
    // Red flags based on verified account
    if (userInfo && !userInfo.verified) {
      redFlags.push('Official Twitter account is not verified');
    }
    
    // Red flags based on follower count
    if (userInfo && userInfo.public_metrics.followers_count < 1000) {
      redFlags.push('Official account has very few followers');
    }
    
    // Positive indicators based on sentiment
    if (sentimentBreakdown.positive > 60) {
      positiveIndicators.push('Strong positive sentiment on Twitter');
    }
    
    // Positive indicators based on tweet volume
    if (tweetSentiments.length > 50) {
      positiveIndicators.push('High volume of Twitter discussion');
    }
    
    // Positive indicators based on engagement
    if (engagementRate > 10) {
      positiveIndicators.push('High engagement with tweets about this project');
    }
    
    // Positive indicators based on verified account
    if (userInfo && userInfo.verified) {
      positiveIndicators.push('Project has a verified official Twitter account');
    }
    
    // Positive indicators based on follower count
    if (userInfo && userInfo.public_metrics.followers_count > 100000) {
      positiveIndicators.push('Official account has a large follower base');
    }
    
    return {
      overallSentiment,
      overallSentimentScore,
      riskScore,
      riskLevel,
      redFlags,
      positiveIndicators,
      tweetCount: tweetSentiments.length,
      recentTweets: tweetSentiments.slice(0, 5), // Include only 5 most recent tweets in report
      userInfo,
      tweetFrequency,
      engagementRate,
      sentimentBreakdown
    };
  }
  
  /**
   * Format Twitter analysis report with rich markdown
   */
  private formatTwitterAnalysisReport(projectIdentifier: string, assessment: TwitterRiskAssessment): string {
    // Get sentiment emoji
    const sentimentEmoji = assessment.overallSentiment === 'positive' ? '😀' : 
                         assessment.overallSentiment === 'neutral' ? '😐' : '😟';
    
    // Get risk level badge
    const riskBadge = assessment.riskLevel === 'Low' ? '🟢 **LOW RISK**' : 
                    assessment.riskLevel === 'Medium' ? '🟠 **MEDIUM RISK**' : 
                    '🔴 **HIGH RISK**';
    
    // Format official account info if available
    let officialAccountSection = '';
    if (assessment.userInfo) {
      officialAccountSection = `
## Official Twitter Account
- **Handle:** @${assessment.userInfo.username}
- **Name:** ${assessment.userInfo.name}
- **Verified:** ${assessment.userInfo.verified ? '✓ Yes' : '✗ No'}
- **Followers:** ${this.formatNumber(assessment.userInfo.public_metrics.followers_count)}
- **Following:** ${this.formatNumber(assessment.userInfo.public_metrics.following_count)}
- **Total Tweets:** ${this.formatNumber(assessment.userInfo.public_metrics.tweet_count)}`;
    } else {
      officialAccountSection = `
## Official Twitter Account
- No verified official account found for ${projectIdentifier}`;
    }
    
    // Format recent tweets section
    let recentTweetsSection = '';
    if (assessment.recentTweets.length > 0) {
      const tweetList = assessment.recentTweets.map(item => {
        const mentionEmoji = item.sentiment === 'positive' ? '😀' : 
                           item.sentiment === 'neutral' ? '😐' : '😟';
        const date = new Date(item.tweet.created_at).toLocaleDateString();
        const metrics = item.tweet.public_metrics;
        const sentimentScore = item.sentimentScore.toFixed(2);
        
        return `- **${date} | ${mentionEmoji} | Score: ${sentimentScore}**
  > "${item.tweet.text.replace(/\n/g, ' ')}"
  > — ${metrics.like_count} likes, ${metrics.retweet_count} retweets, ${metrics.reply_count} replies`;
      }).join('\n\n');
      
      recentTweetsSection = `
## Recent Tweets
${tweetList}`;
    } else {
      recentTweetsSection = `
## Recent Tweets
No recent tweets found related to ${projectIdentifier}`;
    }
    
    // Create sentiment bar
    const sentimentBar = this.generateSentimentBar(
      assessment.sentimentBreakdown.positive,
      assessment.sentimentBreakdown.neutral,
      assessment.sentimentBreakdown.negative
    );
    
    // Assemble the complete report
    return `# Twitter Sentiment Analysis for ${projectIdentifier}

## Risk Summary
**Social Risk Score:** ${assessment.riskScore}/100 (${assessment.riskLevel} Risk)
${riskBadge}

## Overall Sentiment: ${this.capitalizeFirstLetter(assessment.overallSentiment)} ${sentimentEmoji}
**Sentiment Score:** ${assessment.overallSentimentScore.toFixed(2)} (range: -1.0 to 1.0)
**Tweet Volume:** ${assessment.tweetCount} related tweets found
**Analysis Method:** AI-powered sentiment analysis using Gemini LLM

${sentimentBar}
- 😀 Positive: ${assessment.sentimentBreakdown.positive}%
- 😐 Neutral: ${assessment.sentimentBreakdown.neutral}%
- 😟 Negative: ${assessment.sentimentBreakdown.negative}%

## Engagement Metrics
- **Average Engagement:** ${assessment.engagementRate.toFixed(2)} interactions per tweet
${officialAccountSection}

## Key Findings

### Red Flags ${assessment.redFlags.length === 0 ? '✅ None detected' : ''}
${assessment.redFlags.map(flag => `- ⚠️ ${flag}`).join('\n')}

### Positive Indicators ${assessment.positiveIndicators.length === 0 ? '❌ None detected' : ''}
${assessment.positiveIndicators.map(indicator => `- ✅ ${indicator}`).join('\n')}
${recentTweetsSection}

## Recommendations
${this.generateRecommendations(assessment)}

*This analysis provides Twitter sentiment data only and should be combined with blockchain data, team verification, and market performance for a complete risk assessment.*`;
  }
  
  /**
   * Generate a visual sentiment bar using Unicode block characters
   */
  private generateSentimentBar(positive: number, neutral: number, negative: number): string {
    const totalBars = 20;
    const positiveBars = Math.round(positive * totalBars / 100);
    const neutralBars = Math.round(neutral * totalBars / 100);
    const negativeBars = totalBars - positiveBars - neutralBars;
    
    const positiveSection = '🟢'.repeat(positiveBars);
    const neutralSection = '⚪'.repeat(neutralBars);
    const negativeSection = '🔴'.repeat(negativeBars);
    
    return `${positiveSection}${neutralSection}${negativeSection}`;
  }
  
  /**
   * Generate recommendations based on social analysis
   */
  private generateRecommendations(assessment: TwitterRiskAssessment): string {
    const recommendations = [];
    
    if (assessment.riskLevel === 'High') {
      recommendations.push('⚠️ **CAUTION ADVISED** - Twitter sentiment indicates significant risk. Consider delaying investment until sentiment improves.');
    } else if (assessment.riskLevel === 'Medium') {
      recommendations.push('⚠️ **MODERATE CAUTION** - Mixed Twitter sentiment suggests careful research before investing.');
    } else {
      recommendations.push('✅ **FAVORABLE SENTIMENT** - Twitter indicators are positive, suggesting community confidence.');
    }
    
    if (assessment.redFlags.length > 2) {
      recommendations.push('⚠️ Multiple red flags detected. Recommend thorough investigation before proceeding.');
    }
    
    if (assessment.tweetCount < 10) {
      recommendations.push('⚠️ Limited Twitter discussion found. Project may have low visibility or be very new.');
    }
    
    if (!assessment.userInfo) {
      recommendations.push('⚠️ No official Twitter account identified. Verify the project\'s social media presence.');
    } else if (!assessment.userInfo.verified) {
      recommendations.push('⚠️ Project has an unverified Twitter account. Verify its authenticity through other channels.');
    }
    
    if (assessment.userInfo && assessment.userInfo.verified && assessment.overallSentiment === 'positive') {
      recommendations.push('✅ Project has a verified account with positive community sentiment, suggesting legitimacy.');
    }
    
    return recommendations.join('\n');
  }
  
  /**
   * Helper to capitalize first letter of a string
   */
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  /**
   * Format numbers with commas for thousands
   */
  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  
  /**
   * Add social media-specific capabilities
   */
  private addSocialMediaCapabilities() {
    const self = this; // Store a reference to the class instance
    
    // Add capability to get Twitter sentiment for a specific project
    this.addCapability({
      name: 'getTwitterSentiment',
      description: 'Get Twitter sentiment for a specific cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or address of the crypto project')
      }),
      async run({ args }) {
        try {
          // Try to get the official Twitter account if it's a known project
          const projectTwitterHandle = await self.findProjectTwitterHandle(args.projectIdentifier);
          
          // Get tweets related to the project
          const relatedTweets = await self.searchTweets(args.projectIdentifier);
          
          if (relatedTweets.length === 0) {
            return JSON.stringify({
              error: `No tweets found for ${args.projectIdentifier}`
            });
          }
          
          // Analyze tweet sentiment using LLM
          const tweetSentiments = await self.analyzeTweetSentimentsWithLLM(relatedTweets);
          
          // Get project's Twitter account info if we found the handle
          let projectTwitterInfo;
          if (projectTwitterHandle) {
            projectTwitterInfo = await self.getTwitterUserInfo(projectTwitterHandle);
          }
          
          // Calculate overall assessment
          const assessment = self.calculateTwitterRiskAssessment(
            tweetSentiments, 
            projectTwitterInfo
          );
          
          return JSON.stringify({
            projectIdentifier: args.projectIdentifier,
            sentiment: assessment.overallSentiment,
            sentimentScore: assessment.overallSentimentScore,
            riskScore: assessment.riskScore,
            riskLevel: assessment.riskLevel,
            tweetCount: assessment.tweetCount
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error analyzing Twitter sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to get recent tweets for a project
    this.addCapability({
      name: 'getRecentTweets',
      description: 'Get recent tweets about a cryptocurrency project',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or address of the crypto project'),
        limit: z.number().min(1).max(100).default(10).describe('The number of tweets to return (max 100)')
      }),
      async run({ args }) {
        try {
          const relatedTweets = await self.searchTweets(args.projectIdentifier);
          
          if (relatedTweets.length === 0) {
            return JSON.stringify({
              error: `No tweets found for ${args.projectIdentifier}`
            });
          }
          
          return JSON.stringify({
            projectIdentifier: args.projectIdentifier,
            tweets: relatedTweets.slice(0, args.limit)
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error getting tweets: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to get project's Twitter info
    this.addCapability({
      name: 'getProjectTwitterInfo',
      description: 'Get information about a cryptocurrency project\'s official Twitter account',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or address of the crypto project')
      }),
      async run({ args }) {
        try {
          const projectTwitterHandle = await self.findProjectTwitterHandle(args.projectIdentifier);
          
          if (!projectTwitterHandle) {
            return JSON.stringify({
              error: `No known Twitter handle for ${args.projectIdentifier}`
            });
          }
          
          const userInfo = await self.getTwitterUserInfo(projectTwitterHandle);
          
          if (!userInfo) {
            return JSON.stringify({
              error: `Could not find Twitter user @${projectTwitterHandle}`
            });
          }
          
          return JSON.stringify(userInfo, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error getting Twitter info: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
    
    // Add capability to perform full Twitter risk assessment
    this.addCapability({
      name: 'assessTwitterRisk',
      description: 'Perform a complete Twitter risk assessment for a project',
      schema: z.object({
        projectIdentifier: z.string().describe('The name or address of the crypto project')
      }),
      async run({ args }) {
        try {
          // Try to get the official Twitter account if it's a known project
          const projectTwitterHandle = await self.findProjectTwitterHandle(args.projectIdentifier);
          
          // Get tweets related to the project
          const relatedTweets = await self.searchTweets(args.projectIdentifier);
          
          if (relatedTweets.length === 0) {
            return JSON.stringify({
              error: `No tweets found for ${args.projectIdentifier}`
            });
          }
          
          // Analyze tweet sentiment using LLM
          const tweetSentiments = await self.analyzeTweetSentimentsWithLLM(relatedTweets);
          
          // Get project's Twitter account info if we found the handle
          let projectTwitterInfo;
          if (projectTwitterHandle) {
            projectTwitterInfo = await self.getTwitterUserInfo(projectTwitterHandle);
          }
          
          // Calculate overall assessment
          const assessment = self.calculateTwitterRiskAssessment(
            tweetSentiments, 
            projectTwitterInfo
          );
          
          return JSON.stringify({
            projectIdentifier: args.projectIdentifier,
            sentiment: assessment.overallSentiment,
            sentimentScore: assessment.overallSentimentScore,
            riskScore: assessment.riskScore,
            riskLevel: assessment.riskLevel,
            redFlags: assessment.redFlags,
            positiveIndicators: assessment.positiveIndicators,
            tweetCount: assessment.tweetCount,
            hasOfficialAccount: !!projectTwitterInfo,
            accountVerified: projectTwitterInfo?.verified || false
          }, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: `Error performing risk assessment: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });
  }
} 