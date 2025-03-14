import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SocialMediaAgent } from '../../src/agents/social/social-agent';
import axios from 'axios';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
process.env.TWITTER_BEARER_TOKEN = 'test_token';
process.env.GEMINI_API_KEY = 'test_key';

describe('SocialMediaAgent', () => {
  let agent: SocialMediaAgent;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new agent instance for each test
    agent = new SocialMediaAgent();
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('Twitter Search', () => {
    it('should fetch tweets about a cryptocurrency', async () => {
      // Mock Twitter API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: '1',
              text: 'Bitcoin is looking bullish today! #BTC #crypto',
              created_at: '2023-04-01T12:00:00Z',
              public_metrics: {
                retweet_count: 10,
                reply_count: 5,
                like_count: 25,
                quote_count: 3
              }
            },
            {
              id: '2',
              text: 'Just bought some more Bitcoin! Feeling confident about the future. #BTC',
              created_at: '2023-04-01T11:30:00Z',
              public_metrics: {
                retweet_count: 5,
                reply_count: 2,
                like_count: 15,
                quote_count: 1
              }
            }
          ],
          meta: {
            result_count: 2
          }
        }
      });

      // Call the searchTwitter method
      const tweets = await (agent as any).searchTwitter('Bitcoin');
      
      // Check the result
      expect(tweets).toHaveLength(2);
      expect(tweets[0].text).toContain('Bitcoin is looking bullish');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://api.twitter.com/2/tweets/search/recent'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token'
          })
        })
      );
    });

    it('should return empty array when Twitter API fails', async () => {
      // Mock Twitter API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Call the searchTwitter method
      const tweets = await (agent as any).searchTwitter('Bitcoin');
      
      // Check the result is an empty array
      expect(tweets).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should analyze tweet sentiment using preprocessed data when no API is available', async () => {
      // Mock the searchTwitter method to return mock tweets
      (agent as any).searchTwitter = jest.fn().mockResolvedValue([]);
      (agent as any).getMockTweets = jest.fn().mockReturnValue([
        {
          id: '1',
          text: 'Bitcoin is looking bullish today!',
          created_at: '2023-04-01T12:00:00Z',
          public_metrics: {
            retweet_count: 10,
            reply_count: 5,
            like_count: 25,
            quote_count: 3
          }
        },
        {
          id: '2',
          text: 'Just sold all my Bitcoin, it looks too risky now.',
          created_at: '2023-04-01T11:30:00Z',
          public_metrics: {
            retweet_count: 5,
            reply_count: 2,
            like_count: 15,
            quote_count: 1
          }
        }
      ]);
      
      // Mock the batch analysis function
      (agent as any).analyzeBatchWithLLM = jest.fn().mockResolvedValue([
        { sentiment: 'positive', confidence: 0.85, reasoning: 'Bullish outlook indicates optimism' },
        { sentiment: 'negative', confidence: 0.75, reasoning: 'Selling and mentioning risk indicates negative sentiment' }
      ]);

      // Call the analyzeSocialSentiment method
      const result = await (agent as any).analyzeSocialSentiment('Bitcoin');
      
      // Check the sentiment analysis results
      expect(result).toBeDefined();
      expect(result.overallSentiment).toBeDefined();
      expect(result.positivePercentage).toBeDefined();
      expect(result.negativePercentage).toBeDefined();
      expect(result.neutralPercentage).toBeDefined();
      expect((agent as any).analyzeBatchWithLLM).toHaveBeenCalled();
    });

    it('should calculate correct sentiment percentages', () => {
      const sentimentData = [
        { sentiment: 'positive', confidence: 0.9 },
        { sentiment: 'positive', confidence: 0.8 },
        { sentiment: 'negative', confidence: 0.7 },
        { sentiment: 'neutral', confidence: 0.6 },
        { sentiment: 'positive', confidence: 0.85 }
      ];

      const result = (agent as any).calculateSentimentPercentages(sentimentData);
      
      expect(result.positivePercentage).toBe(60);
      expect(result.negativePercentage).toBe(20);
      expect(result.neutralPercentage).toBe(20);
    });

    it('should determine correct overall sentiment based on percentages', () => {
      // Positive case
      expect((agent as any).determineOverallSentiment(60, 20, 20)).toBe('positive');
      
      // Negative case
      expect((agent as any).determineOverallSentiment(20, 60, 20)).toBe('negative');
      
      // Neutral case
      expect((agent as any).determineOverallSentiment(30, 30, 40)).toBe('neutral');
      
      // Mixed case (no clear majority)
      expect((agent as any).determineOverallSentiment(40, 40, 20)).toBe('mixed');
    });
  });

  describe('Engagement Metrics', () => {
    it('should calculate engagement metrics correctly', () => {
      const tweets = [
        {
          id: '1',
          text: 'Tweet 1',
          public_metrics: {
            retweet_count: 10,
            reply_count: 5,
            like_count: 25,
            quote_count: 3
          }
        },
        {
          id: '2',
          text: 'Tweet 2',
          public_metrics: {
            retweet_count: 5,
            reply_count: 2,
            like_count: 15,
            quote_count: 1
          }
        }
      ];

      const metrics = (agent as any).calculateEngagementMetrics(tweets);
      
      expect(metrics.totalEngagement).toBe(66); // Sum of all engagement metrics
      expect(metrics.averageLikes).toBe(20); // (25 + 15) / 2
      expect(metrics.averageRetweets).toBe(7.5); // (10 + 5) / 2
      expect(metrics.engagementRatio).toBeGreaterThan(0);
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate social risk score based on sentiment and engagement', () => {
      // Test data
      const sentimentData = {
        overallSentiment: 'negative',
        positivePercentage: 20,
        negativePercentage: 60,
        neutralPercentage: 20,
        sentimentDetails: []
      };
      
      const engagementMetrics = {
        totalEngagement: 1000,
        averageLikes: 50,
        averageRetweets: 20,
        engagementRatio: 0.5
      };

      // Call the calculateSocialRiskScore method
      const riskScore = (agent as any).calculateSocialRiskScore(sentimentData, engagementMetrics);
      
      // Check the result is in the expected range
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
      
      // With negative sentiment, the risk score should be higher
      expect(riskScore).toBeGreaterThan(50);
    });
  });
}); 