import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  SYSTEM_PROMPT,
  NAME_SYSTEM_PROMPT,
  MODIFY_TOOLS_SYSTEM_PROMPT,
  getDesignPrompt,
  getModificationPrompt,
  getModificationToolPrompt,
  getNamePrompt,
} from './prompts';

export const OPENAI_MODEL = 'gpt-5.2-2025-12-11';
export const CLAUDE_MODEL = 'claude-opus-4-6';
const CLAUDE_MAX_OUTPUT_TOKENS = 128000;

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
   * Generate initial page
   */
  async generatePage(
    userDescription: string,
    options?: GenerateOptions
  ): Promise<string> {
    // Create design prompt
    const prompt = getDesignPrompt(userDescription);

    // Clear conversation history for new design
    this.conversationHistory = [];

    // Generate HTML
    const html = await this.chat(prompt, options);

    return this.extractHtml(html);
  }

  /**
   * Modify existing page based on user feedback
   */
  async modifyPage(
    currentHtml: string,
    userFeedback: string,
    options?: GenerateOptions
  ): Promise<string> {
    const toolPrompt = getModificationToolPrompt(currentHtml, userFeedback);
    options?.onProgress?.('Planning edits...');

    try {
      const toolResponse = await this.chatOnce(
        MODIFY_TOOLS_SYSTEM_PROMPT,
        toolPrompt
      );
      const updatedHtml = this.applyHtmlEditPlan(currentHtml, toolResponse);
      options?.onProgress?.('Applying edits...');
      return updatedHtml;
    } catch {
      // Fallback to legacy full-html rewrite if tool planning fails.
      const prompt = getModificationPrompt(currentHtml, userFeedback);
      const html = await this.chatOnce(SYSTEM_PROMPT, prompt, options);
      return this.extractHtml(html);
    }
  }

  /**
   * Generate a short product name based on user description
   */
  async generatePageName(userDescription: string): Promise<string> {
    const prompt = getNamePrompt(userDescription);

    if (this.provider === 'openai') {
      if (!this.openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      const completion = await this.openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: NAME_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });

      return (completion.choices[0]?.message?.content || 'Untitled Page').trim();
    }

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 50,
      system: NAME_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const content = response.content.find(
      (block) => block.type === 'text'
    ) as { text?: string } | undefined;
    return (content?.text || 'Untitled Page').trim();
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

  private async chatOnce(
    systemPrompt: string,
    userMessage: string,
    options?: GenerateOptions
  ): Promise<string> {
    if (this.provider === 'openai') {
      return this.chatOpenAIOnce(systemPrompt, userMessage, options);
    }
    return this.chatClaudeOnce(systemPrompt, userMessage, options);
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
      model: OPENAI_MODEL,
      messages,
      stream: true,
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

  private async chatOpenAIOnce(
    systemPrompt: string,
    userMessage: string,
    options?: GenerateOptions
  ): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await this.openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      options?.onProgress?.(content);
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
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
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

  private async chatClaudeOnce(
    systemPrompt: string,
    userMessage: string,
    options?: GenerateOptions
  ): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const stream = await this.anthropicClient.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        const content = chunk.delta.text;
        fullResponse += content;
        options?.onProgress?.(content);
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

  private extractJson(response: string): string {
    const cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return cleaned.slice(firstBrace, lastBrace + 1);
    }
    throw new Error('Invalid JSON edit plan');
  }

  private applyHtmlEditPlan(currentHtml: string, response: string): string {
    const json = this.extractJson(response);
    const parsed = JSON.parse(json) as {
      edits?: Array<{
        tool?: string;
        selector?: string;
        value?: string;
        attr?: string;
      }>;
    };

    const edits = parsed.edits || [];
    if (edits.length === 0) {
      throw new Error('No edits returned');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');
    let applied = 0;

    for (const edit of edits) {
      const tool = edit.tool;
      const selector = edit.selector;
      const value = edit.value ?? '';
      const attr = edit.attr;
      if (!tool || !selector) {
        continue;
      }

      const target = doc.querySelector(selector);
      if (!target) {
        continue;
      }

      switch (tool) {
        case 'replace_inner_html':
          target.innerHTML = value;
          applied++;
          break;
        case 'replace_outer_html':
          target.outerHTML = value;
          applied++;
          break;
        case 'set_text':
          target.textContent = value;
          applied++;
          break;
        case 'set_attr':
          if (attr) {
            target.setAttribute(attr, value);
            applied++;
          }
          break;
        case 'remove':
          target.remove();
          applied++;
          break;
        case 'append_html':
          target.insertAdjacentHTML('beforeend', value);
          applied++;
          break;
        case 'prepend_html':
          target.insertAdjacentHTML('afterbegin', value);
          applied++;
          break;
        case 'set_script':
        case 'set_style':
          target.textContent = value;
          applied++;
          break;
        default:
          break;
      }
    }

    if (applied === 0) {
      throw new Error('No valid edits applied');
    }

    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
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
