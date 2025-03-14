import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReportingAgent } from '../../src/agents/reporting';
import { AnalysisAgent } from '../../src/agents/analysis';
import fs from 'fs';

// Mock the Analysis Agent
jest.mock('../../src/agents/analysis');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockRejectedValue(new Error('File not found'))
  },
  existsSync: jest.fn().mockReturnValue(false)
}));

// Mock environment variables
process.env.GEMINI_API_KEY = 'test_key';

describe('ReportingAgent', () => {
  let agent: ReportingAgent;
  let mockAnalysisAgent: jest.Mocked<AnalysisAgent>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockAnalysisAgent = new AnalysisAgent() as jest.Mocked<AnalysisAgent>;
    
    // Create a new agent instance for each test
    agent = new ReportingAgent();
    
    // Inject mock into agent
    (agent as any).analysisAgent = mockAnalysisAgent;
  });

  describe('Constructor', () => {
    it('should initialize properly', () => {
      expect(agent).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    it('should generate a PDF report based on risk assessment', async () => {
      // Mock risk assessment data
      const mockAssessment = {
        projectIdentifier: 'Test Project',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        coinId: 'test-coin',
        timestamp: new Date().toISOString(),
        riskScore: 45,
        riskLevel: 'Medium',
        breakdown: {
          blockchain: 30,
          social: 50,
          market: 60,
          dex: 40,
          comprehensive: 45
        },
        riskFactors: {
          blockchain: ['Blockchain risk factor'],
          social: ['Social risk factor'],
          market: ['Market risk factor'],
          dex: ['DEX risk factor']
        },
        blockchainData: {
          isVerified: true,
          contractName: 'Test Contract',
          tokenSymbol: 'TEST',
          holderConcentration: {
            topHolderPercentage: 15,
            top10Percentage: 40
          }
        },
        socialData: {
          overallSentiment: 'positive',
          positivePercentage: 65,
          negativePercentage: 15,
          neutralPercentage: 20
        },
        marketData: {
          price: 100,
          marketCap: 1000000000,
          volume: 50000000,
          priceChange24h: 5.2
        },
        dexData: {
          pairs: [
            {
              dexId: 'uniswap',
              liquidity: { usd: 2000000 }
            }
          ]
        }
      };
      
      // Setup the mock
      (agent as any).callCapability = jest.fn().mockResolvedValue(JSON.stringify(mockAssessment));
      (agent as any).createReportDirectory = jest.fn().mockResolvedValue(true);
      (agent as any).saveReportMetadata = jest.fn().mockResolvedValue(true);
      
      // Mock the report generation
      (agent as any).generatePdfContent = jest.fn().mockResolvedValue('Mock PDF Content');
      
      // Call the generateReport method
      const report = await (agent as any).generateReport('Test Project');
      
      // Check the result
      expect(report).toBeDefined();
      expect(report.projectName).toBe('Test Project');
      expect(report.filename).toContain('Test_Project');
      expect(report.timestamp).toBeDefined();
      expect(report.riskScore).toBe(45);
      expect(report.riskLevel).toBe('Medium');
      
      // Verify method calls
      expect((agent as any).callCapability).toHaveBeenCalledWith(
        expect.any(Object),
        'performRiskAssessment',
        expect.objectContaining({ projectName: 'Test Project' })
      );
      expect((agent as any).createReportDirectory).toHaveBeenCalled();
      expect((agent as any).generatePdfContent).toHaveBeenCalledWith(mockAssessment);
      expect((agent as any).saveReportMetadata).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should create report directory if it does not exist', async () => {
      // Setup the mock
      const mkdirMock = fs.promises.mkdir as jest.Mock;
      
      // Call the createReportDirectory method
      await (agent as any).createReportDirectory();
      
      // Check that mkdir was called
      expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining('reports'), { recursive: true });
    });

    it('should save report metadata', async () => {
      // Mock report data
      const reportData = {
        projectName: 'Test Project',
        filename: 'Test_Project_20230101.pdf',
        timestamp: '2023-01-01T12:00:00Z',
        riskScore: 45,
        riskLevel: 'Medium'
      };
      
      // Setup the mock
      const writeFileMock = fs.promises.writeFile as jest.Mock;
      const readdirMock = fs.promises.readdir as jest.Mock;
      readdirMock.mockResolvedValue(['report1.json', 'report2.json']);
      
      // Call the saveReportMetadata method
      await (agent as any).saveReportMetadata(reportData);
      
      // Check that writeFile was called
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining('reports/metadata'),
        expect.stringContaining('"projectName":"Test Project"'),
        'utf-8'
      );
    });
  });

  describe('Report Listing', () => {
    it('should list available reports', async () => {
      // Mock metadata files
      const mockMetadata = [
        {
          projectName: 'Project 1',
          filename: 'Project_1_20230101.pdf',
          timestamp: '2023-01-01T12:00:00Z',
          riskScore: 30,
          riskLevel: 'Low'
        },
        {
          projectName: 'Project 2',
          filename: 'Project_2_20230102.pdf',
          timestamp: '2023-01-02T12:00:00Z',
          riskScore: 75,
          riskLevel: 'High'
        }
      ];
      
      // Setup the mock
      const readdirMock = fs.promises.readdir as jest.Mock;
      const readFileMock = fs.promises.readFile as jest.Mock;
      
      readdirMock.mockResolvedValue(['project1.json', 'project2.json']);
      readFileMock
        .mockResolvedValueOnce(JSON.stringify(mockMetadata[0]))
        .mockResolvedValueOnce(JSON.stringify(mockMetadata[1]));
      
      // Call the listReports method
      const reports = await (agent as any).listReports();
      
      // Check the result
      expect(reports).toHaveLength(2);
      expect(reports[0].projectName).toBe('Project 1');
      expect(reports[1].projectName).toBe('Project 2');
      expect(readdirMock).toHaveBeenCalledWith(expect.stringContaining('reports/metadata'));
    });

    it('should return empty array when no reports are available', async () => {
      // Setup the mock
      const readdirMock = fs.promises.readdir as jest.Mock;
      readdirMock.mockRejectedValue(new Error('Directory not found'));
      
      // Call the listReports method
      const reports = await (agent as any).listReports();
      
      // Check the result
      expect(reports).toEqual([]);
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF content with risk assessment data', async () => {
      // Mock risk assessment data
      const mockAssessment = {
        projectIdentifier: 'Test Project',
        riskScore: 45,
        riskLevel: 'Medium',
        breakdown: {
          blockchain: 30,
          social: 50,
          market: 60,
          dex: 40
        },
        riskFactors: {
          blockchain: ['Blockchain risk factor'],
          social: ['Social risk factor'],
          market: ['Market risk factor'],
          dex: ['DEX risk factor']
        }
      };
      
      // Call the generatePdfContent method
      const pdfContent = await (agent as any).generatePdfContent(mockAssessment);
      
      // Check the result
      expect(pdfContent).toBeDefined();
      expect(typeof pdfContent).toBe('string');
      expect(pdfContent.length).toBeGreaterThan(0);
    });

    it('should format risk factors for report', () => {
      // Test risk factors
      const riskFactors = {
        blockchain: ['Blockchain risk factor 1', 'Blockchain risk factor 2'],
        social: ['Social risk factor'],
        market: ['Market risk factor 1', 'Market risk factor 2', 'Market risk factor 3'],
        dex: []
      };
      
      // Call the formatRiskFactorsForReport method
      const formatted = (agent as any).formatRiskFactorsForReport(riskFactors);
      
      // Check the result
      expect(formatted).toBeDefined();
      expect(formatted).toContain('Blockchain risk factor 1');
      expect(formatted).toContain('Blockchain risk factor 2');
      expect(formatted).toContain('Social risk factor');
      expect(formatted).toContain('Market risk factor');
      expect(formatted).toContain('No specific risk factors identified'); // For empty DEX section
    });
  });
}); 