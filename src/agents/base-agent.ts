import { Agent } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist';
import { z } from 'zod';
import { respondChatMessageActionSchema } from '/Users/f-cillionairerahul/Downloads/sdk-main/dist/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Base agent class that all specialized agents will extend
 * Provides common functionality and configuration
 */
export class BaseAgent extends Agent {
  /**
   * The name of the agent
   */
  protected agentName: string;
  
  /**
   * Initialize the base agent with common configuration
   * @param systemPrompt The system prompt for the agent
   * @param name The name of the agent
   */
  constructor(systemPrompt: string, name: string) {
    super({
      systemPrompt,
      llmProvider: 'gemini',
      llmApiKey: process.env.GEMINI_API_KEY,
      llmModel: 'gemini-2.0-flash' // Default model for Gemini
    });
    
    this.agentName = name;
    console.log(`${this.agentName} agent initialized`);
  }
  
  /**
   * Default implementation for responding to chat messages
   * Can be overridden by specialized agents
   */
  protected async respondToChat(action: z.infer<typeof respondChatMessageActionSchema>): Promise<void> {
    // Default implementation
    this.sendChatMessage({
      workspaceId: action.workspace.id,
      agentId: action.me.id,
      message: `I am the ${this.agentName} agent and I'm ready to assist.`
    });
  }
} 