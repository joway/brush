import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  SYSTEM_PROMPT,
  NAME_SYSTEM_PROMPT,
  getDesignPrompt,
  getModificationPrompt,
  getNamePrompt,
  isProductRequirement,
  detectLanguage,
  getRejectionMessage,
} from './prompts';

export type AIProvider = 'openai' | 'claude';

export interface DesignAgentConfig {
  provider: AIProvider;
  apiKey: string;
}

export interface GenerateOptions {
  onProgress?: (chunk: string) => void;
}

export class DesignAgent {
  private provider: AIProvider;
  private apiKey: string;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(config: DesignAgentConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;

    if (this.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true, // Required for browser usage
      });
    } else {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true, // Required for browser usage
      });
    }
  }

  /**
   * Generate initial product prototype
   */
  async generatePrototype(
    userDescription: string,
    options?: GenerateOptions
  ): Promise<string> {
    // Validate input
    if (!isProductRequirement(userDescription)) {
      const language = detectLanguage(userDescription);
      return getRejectionMessage(language);
    }

    // Create design prompt
    const prompt = getDesignPrompt(userDescription);

    // Clear conversation history for new design
    this.conversationHistory = [];

    // Generate HTML
    const html = await this.chat(prompt, options);

    return this.extractHtml(html);
  }

  /**
   * Modify existing prototype based on user feedback
   */
  async modifyPrototype(
    currentHtml: string,
    userFeedback: string,
    options?: GenerateOptions
  ): Promise<string> {
    const prompt = getModificationPrompt(currentHtml, userFeedback);

    const html = await this.chat(prompt, options);

    return this.extractHtml(html);
  }

  /**
   * Generate a short product name based on user description
   */
  async generatePrototypeName(userDescription: string): Promise<string> {
    const prompt = getNamePrompt(userDescription);

    if (this.provider === 'openai') {
      if (!this.openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      const completion = await this.openaiClient.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: NAME_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      });

      return (completion.choices[0]?.message?.content || 'Untitled Prototype').trim();
    }

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      system: NAME_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const content = response.content.find(
      (block) => block.type === 'text'
    ) as { text?: string } | undefined;
    return (content?.text || 'Untitled Prototype').trim();
  }

  /**
   * Core chat method that calls the appropriate AI provider
   */
  private async chat(
    userMessage: string,
    options?: GenerateOptions
  ): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let response = '';

    if (this.provider === 'openai') {
      response = await this.chatOpenAI(options);
    } else {
      response = await this.chatClaude(options);
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
    });

    return response;
  }

  /**
   * Call OpenAI API
   */
  private async chatOpenAI(options?: GenerateOptions): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    const stream = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      stream: true,
      temperature: 0.7,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      if (options?.onProgress) {
        options.onProgress(content);
      }
    }

    return fullResponse;
  }

  /**
   * Call Claude API
   */
  private async chatClaude(options?: GenerateOptions): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const stream = await this.anthropicClient.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: this.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        const content = chunk.delta.text;
        fullResponse += content;
        if (options?.onProgress) {
          options.onProgress(content);
        }
      }
    }

    return fullResponse;
  }

  /**
   * Extract HTML from AI response (remove markdown code blocks if present)
   */
  private extractHtml(response: string): string {
    // Remove markdown code blocks if present
    let html = response.trim();

    // Remove ```html and ``` if present
    if (html.startsWith('```html')) {
      html = html.replace(/^```html\n?/, '');
    } else if (html.startsWith('```')) {
      html = html.replace(/^```\n?/, '');
    }

    if (html.endsWith('```')) {
      html = html.replace(/\n?```$/, '');
    }

    return html.trim();
  }

  /**
   * Reset conversation history
   */
  resetHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }
}
