/**
 * OpenAI Provider Adapter
 * 
 * Handles chat completions, embeddings, and image generation.
 */

import type {
  ApiKeyCredentials,
  Credentials,
  ExecutionContext,
  OpenAIOperation,
  OperationId,
} from "../types";
import { BaseProviderAdapter, makeRequest } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// OpenAI Configuration
// ============================================================================

const OPENAI_API_URL = "https://api.openai.com/v1";

const OPENAI_MODELS = {
  chat: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  embedding: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
  image: ["dall-e-3", "dall-e-2"],
};

// ============================================================================
// OpenAI Provider Adapter
// ============================================================================

export class OpenAIAdapter extends BaseProviderAdapter {
  readonly providerId = "openai" as const;
  readonly supportedOperations: OperationId[] = [
    "chat.completion",
    "chat.stream",
    "embeddings.create",
    "images.generate",
  ];
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const apiKey = this.getApiKey(credentials);
    
    switch (operation as OpenAIOperation) {
      case "chat.completion":
        return this.chatCompletion(input, apiKey);
      case "chat.stream":
        return this.chatStream(input, apiKey);
      case "embeddings.create":
        return this.createEmbeddings(input, apiKey);
      case "images.generate":
        return this.generateImage(input, apiKey);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
    }
  }
  
  /**
   * Get API key from credentials (with env fallback)
   */
  private getApiKey(credentials: Credentials): string {
    // First try environment variable
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) {
      return envKey;
    }
    
    // Then try credentials
    if (credentials?.type === "api_key") {
      return (credentials as ApiKeyCredentials).apiKey;
    }
    
    throw createError("INVALID_CREDENTIALS", "OpenAI requires API key - set OPENAI_API_KEY in environment");
  }
  
  // ============================================================================
  // Chat Operations
  // ============================================================================
  
  /**
   * Create a chat completion
   */
  private async chatCompletion(
    input: Record<string, unknown>,
    apiKey: string
  ): Promise<Record<string, unknown>> {
    const {
      model = "gpt-4o-mini",
      messages,
      prompt,
      systemPrompt,
      maxTokens = 1000,
      temperature = 0.7,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
      responseFormat,
    } = input as {
      model?: string;
      messages?: Array<{ role: string; content: string }>;
      prompt?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string | string[];
      responseFormat?: { type: "text" | "json_object" };
    };
    
    // Build messages array
    let chatMessages: Array<{ role: string; content: string }> = [];
    
    if (messages && Array.isArray(messages)) {
      chatMessages = messages;
    } else {
      if (systemPrompt) {
        chatMessages.push({ role: "system", content: systemPrompt });
      }
      if (prompt) {
        chatMessages.push({ role: "user", content: prompt });
      }
    }
    
    if (chatMessages.length === 0) {
      throw createError("VALIDATION_ERROR", "Messages or prompt is required");
    }
    
    const requestBody: Record<string, unknown> = {
      model,
      messages: chatMessages,
      max_tokens: maxTokens,
      temperature,
    };
    
    if (topP !== undefined) requestBody.top_p = topP;
    if (frequencyPenalty !== undefined) requestBody.frequency_penalty = frequencyPenalty;
    if (presencePenalty !== undefined) requestBody.presence_penalty = presencePenalty;
    if (stop) requestBody.stop = stop;
    if (responseFormat) requestBody.response_format = responseFormat;
    
    const response = await makeRequest(
      `${OPENAI_API_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      { provider: this.providerId, operation: "chat.completion" }
    );
    
    const result = await response.json();
    const choice = result.choices?.[0];
    
    return {
      success: true,
      content: choice?.message?.content || "",
      role: choice?.message?.role || "assistant",
      finishReason: choice?.finish_reason,
      model: result.model,
      usage: {
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
      },
      // Convenience field for common use case
      output: choice?.message?.content || "",
    };
  }
  
  /**
   * Create a streaming chat completion
   * Note: Returns the final aggregated result
   */
  private async chatStream(
    input: Record<string, unknown>,
    apiKey: string
  ): Promise<Record<string, unknown>> {
    const {
      model = "gpt-4o-mini",
      messages,
      prompt,
      systemPrompt,
      maxTokens = 1000,
      temperature = 0.7,
    } = input as {
      model?: string;
      messages?: Array<{ role: string; content: string }>;
      prompt?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    };
    
    // Build messages array
    let chatMessages: Array<{ role: string; content: string }> = [];
    
    if (messages && Array.isArray(messages)) {
      chatMessages = messages;
    } else {
      if (systemPrompt) {
        chatMessages.push({ role: "system", content: systemPrompt });
      }
      if (prompt) {
        chatMessages.push({ role: "user", content: prompt });
      }
    }
    
    if (chatMessages.length === 0) {
      throw createError("VALIDATION_ERROR", "Messages or prompt is required");
    }
    
    const response = await makeRequest(
      `${OPENAI_API_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      },
      { provider: this.providerId, operation: "chat.stream" }
    );
    
    // Aggregate streamed response
    const reader = response.body?.getReader();
    if (!reader) {
      throw createError("STREAM_ERROR", "Failed to get response stream");
    }
    
    const decoder = new TextDecoder();
    let content = "";
    let finishReason = "";
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) content += delta;
              
              const reason = parsed.choices?.[0]?.finish_reason;
              if (reason) finishReason = reason;
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return {
      success: true,
      content,
      role: "assistant",
      finishReason,
      model,
      streamed: true,
      output: content,
    };
  }
  
  // ============================================================================
  // Embeddings Operations
  // ============================================================================
  
  /**
   * Create embeddings for text
   */
  private async createEmbeddings(
    input: Record<string, unknown>,
    apiKey: string
  ): Promise<Record<string, unknown>> {
    const {
      model = "text-embedding-3-small",
      input: textInput,
      dimensions,
    } = input as {
      model?: string;
      input: string | string[];
      dimensions?: number;
    };
    
    if (!textInput) {
      throw createError("VALIDATION_ERROR", "Input text is required");
    }
    
    const requestBody: Record<string, unknown> = {
      model,
      input: textInput,
    };
    
    if (dimensions) requestBody.dimensions = dimensions;
    
    const response = await makeRequest(
      `${OPENAI_API_URL}/embeddings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      { provider: this.providerId, operation: "embeddings.create" }
    );
    
    const result = await response.json();
    
    return {
      success: true,
      embeddings: result.data?.map((d: { embedding: number[] }) => d.embedding) || [],
      model: result.model,
      usage: {
        promptTokens: result.usage?.prompt_tokens,
        totalTokens: result.usage?.total_tokens,
      },
      // Convenience: first embedding for single input
      embedding: result.data?.[0]?.embedding || [],
    };
  }
  
  // ============================================================================
  // Image Operations
  // ============================================================================
  
  /**
   * Generate an image
   */
  private async generateImage(
    input: Record<string, unknown>,
    apiKey: string
  ): Promise<Record<string, unknown>> {
    const {
      model = "dall-e-3",
      prompt,
      n = 1,
      size = "1024x1024",
      quality = "standard",
      style = "vivid",
      responseFormat = "url",
    } = input as {
      model?: string;
      prompt: string;
      n?: number;
      size?: string;
      quality?: "standard" | "hd";
      style?: "vivid" | "natural";
      responseFormat?: "url" | "b64_json";
    };
    
    if (!prompt) {
      throw createError("VALIDATION_ERROR", "Prompt is required");
    }
    
    const requestBody: Record<string, unknown> = {
      model,
      prompt,
      n,
      size,
      response_format: responseFormat,
    };
    
    // DALL-E 3 specific options
    if (model === "dall-e-3") {
      requestBody.quality = quality;
      requestBody.style = style;
    }
    
    const response = await makeRequest(
      `${OPENAI_API_URL}/images/generations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      { provider: this.providerId, operation: "images.generate" }
    );
    
    const result = await response.json();
    
    return {
      success: true,
      images: result.data || [],
      // Convenience: first image URL for single generation
      url: result.data?.[0]?.url || "",
      revisedPrompt: result.data?.[0]?.revised_prompt,
    };
  }
}

// Export singleton instance
export const openaiAdapter = new OpenAIAdapter();


