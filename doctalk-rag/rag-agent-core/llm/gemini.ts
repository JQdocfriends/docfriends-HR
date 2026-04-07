/**
 * Gemini Chat Provider - Google AI 모델 기반 채팅
 */

import { GoogleGenAI } from "@google/genai";
import type { 
  LLMProvider, 
  ChatMessage, 
  ChatCompletionOptions, 
  ChatCompletionResult,
  StreamChunk 
} from "./provider";
import { logApiUsage } from "../../services/apiUsageTracker";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export class GeminiChatProvider implements LLMProvider {
  name = "gemini";
  private model: string;
  private maxRetries: number;
  
  constructor(model: string = "gemini-2.5-flash", maxRetries: number = 3) {
    this.model = model;
    this.maxRetries = maxRetries;
  }
  
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system");
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const contents = chatMessages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
        })) as any;

        const response = await gemini.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction: typeof systemMessage?.content === 'string' ? systemMessage.content : undefined,
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 1000,
            topP: options.topP ?? 1,
          },
        });
        
        const latencyMs = Date.now() - startTime;
        const content = response.text || "";
        const tokensIn = response.usageMetadata?.promptTokenCount || 0;
        const tokensOut = response.usageMetadata?.candidatesTokenCount || 0;
        
        // Log API usage
        await logApiUsage({
          doctorId: options.doctorId || 'system',
          endpoint: options.endpoint || 'gemini-chat',
          model: this.model,
          inputTokens: tokensIn,
          outputTokens: tokensOut,
          responseTimeMs: latencyMs,
          status: 'success',
        });
        
        return {
          content,
          tokensIn,
          tokensOut,
          model: this.model,
          latencyMs,
          finishReason: "stop"
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error("Gemini chat failed after retries");
  }
  
  async *chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    let fullContent = "";
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system");
    
    try {
      const contents = chatMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
      })) as any;

      const response = await gemini.models.generateContentStream({
        model: this.model,
        contents,
        config: {
          systemInstruction: typeof systemMessage?.content === 'string' ? systemMessage.content : undefined,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1000,
        },
      });
      
      for await (const chunk of response) {
        const content = chunk.text || "";
        fullContent += content;
        yield { content, isDone: false };
      }
      
      yield { content: "", isDone: true };
      
      // Estimate tokens (rough: ~4 chars per token)
      const inputTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
      const outputTokens = Math.ceil(fullContent.length / 4);
      const latencyMs = Date.now() - startTime;
      
      // Log API usage after stream completes
      await logApiUsage({
        doctorId: options.doctorId || 'system',
        endpoint: options.endpoint || 'gemini-chat-stream',
        model: this.model,
        inputTokens,
        outputTokens,
        responseTimeMs: latencyMs,
        status: 'success',
      });
    } catch (error) {
      console.error("Gemini stream error:", error);
      await logApiUsage({
        doctorId: options.doctorId || 'system',
        endpoint: options.endpoint || 'gemini-chat-stream',
        model: this.model,
        status: 'error',
        errorMessage: (error as Error).message,
      });
      yield { content: "", isDone: true };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Just check if API key is configured
      if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const defaultGeminiProvider = new GeminiChatProvider("gemini-2.5-flash");
