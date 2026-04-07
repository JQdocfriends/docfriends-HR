/**
 * OpenAI Chat Provider - GPT 모델 기반 채팅
 */

import OpenAI from "openai";
import type { 
  LLMProvider, 
  ChatMessage, 
  ChatCompletionOptions, 
  ChatCompletionResult,
  StreamChunk,
  MessageContent 
} from "./provider";
import { logApiUsage } from "../../services/apiUsageTracker";

function formatMessageContent(content: MessageContent): string | any[] {
  if (typeof content === "string") {
    return content;
  }
  return content.map(item => {
    if (item.type === "text") {
      return { type: "text", text: item.text };
    } else if (item.type === "image_url") {
      return { 
        type: "image_url", 
        image_url: { 
          url: item.image_url.url,
          detail: item.image_url.detail || "auto"
        } 
      };
    }
    return item;
  });
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  timeout: 60000,
});

if (process.env.DATA_RESIDENCY_REGION === "KR") {
  console.log("[OpenAI] Data Residency: South Korea (KR) configured. Ensure OpenAI project-level residency is set.");
} else {
  console.warn("[OpenAI] ⚠️ DATA_RESIDENCY_REGION is not set to 'KR'. EMR data may leave Korea. Set DATA_RESIDENCY_REGION=KR");
}

// Common Korean titles that should NOT be flagged as PII
const SAFE_KOREAN_TITLES = new Set([
  "원장님", "선생님", "환자님", "보호자님", "어머님", "아버님",
  "부모님", "가족님", "고객님", "회원님", "사용자님", "담당자님",
  "간호사님", "약사님", "의사님", "교수님", "박사님", "관리자님",
]);

function containsPHI(text: string): boolean {
  if (process.env.PII_BLOCK !== "true") return false;
  // RRN (주민번호) - 6 digits + 7 digits
  if (/(\d{6})[-\s]?(\d{7})/.test(text)) return true;
  // Phone number - 2-3 digits + 3-4 digits + 4 digits
  if (/(\d{2,3})[-.\s]?(\d{3,4})[-.\s]?(\d{4})/.test(text)) return true;
  // Korean personal names + 님 (exclude common titles)
  const nameMatches = text.match(/[가-힣]{2,4}\s*님/g);
  if (nameMatches) {
    for (const match of nameMatches) {
      if (!SAFE_KOREAN_TITLES.has(match.replace(/\s/g, ""))) {
        return true;
      }
    }
  }
  return false;
}

function checkMessagesForPHI(messages: ChatMessage[]): void {
  if (process.env.PII_BLOCK !== "true") return;
  for (const msg of messages) {
    const text = typeof msg.content === "string" 
      ? msg.content 
      : msg.content.filter(p => p.type === "text").map(p => (p as any).text).join(" ");
    if (containsPHI(text)) {
      console.error("[OpenAI PHI Guard] PHI/PII detected in outgoing request. Blocking.");
      throw new Error("PHI_DETECTED: Request blocked - contains personally identifiable information");
    }
  }
}

export class OpenAIChatProvider implements LLMProvider {
  name = "openai";
  private model: string;
  private maxRetries: number;
  
  constructor(model: string = "gpt-4o", maxRetries: number = 3) {
    this.model = model;
    this.maxRetries = maxRetries;
  }
  
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    checkMessagesForPHI(messages);
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: this.model,
          messages: messages.map(m => ({
            role: m.role,
            content: formatMessageContent(m.content)
          })) as any,
          temperature: options.temperature ?? 0.7,
          max_completion_tokens: options.maxTokens ?? 1000,
          top_p: options.topP ?? 1,
          frequency_penalty: options.frequencyPenalty ?? 0,
          presence_penalty: options.presencePenalty ?? 0,
        });
        
        const latencyMs = Date.now() - startTime;
        const content = response.choices[0]?.message?.content || "";
        const tokensIn = response.usage?.prompt_tokens || 0;
        const tokensOut = response.usage?.completion_tokens || 0;
        
        // Log API usage
        await logApiUsage({
          doctorId: options.doctorId || 'system',
          endpoint: options.endpoint || 'openai-chat',
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
          finishReason: response.choices[0]?.finish_reason || "unknown"
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`OpenAI attempt ${attempt + 1} failed:`, { message: (error as Error).message, status: (error as any)?.status });
        
        if (attempt < this.maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error("OpenAI chat failed after retries");
  }
  
  async *chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    checkMessagesForPHI(messages);
    const startTime = Date.now();
    let fullContent = "";
    
    try {
      const stream = await openai.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: formatMessageContent(m.content)
        })) as any,
        temperature: options.temperature ?? 0.7,
        max_completion_tokens: options.maxTokens ?? 1000,
        stream: true,
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullContent += content;
        const isDone = chunk.choices[0]?.finish_reason !== null;
        
        yield { content, isDone };
      }
      
      // Estimate tokens (rough: ~4 chars per token for text, 765 tokens per image)
      const inputTokens = Math.ceil(messages.reduce((sum, m) => {
        if (typeof m.content === "string") {
          return sum + m.content.length / 4;
        }
        return sum + m.content.reduce((partSum, part) => {
          if (part.type === "text") {
            return partSum + part.text.length / 4;
          } else if (part.type === "image_url") {
            return partSum + 765;
          }
          return partSum;
        }, 0);
      }, 0));
      const outputTokens = Math.ceil(fullContent.length / 4);
      const latencyMs = Date.now() - startTime;
      
      // Log API usage after stream completes
      await logApiUsage({
        doctorId: options.doctorId || 'system',
        endpoint: options.endpoint || 'openai-chat-stream',
        model: this.model,
        inputTokens,
        outputTokens,
        responseTimeMs: latencyMs,
        status: 'success',
      });
    } catch (error: any) {
      console.error("OpenAI stream error:", { message: error?.message, name: error?.name, status: error?.status });
      await logApiUsage({
        doctorId: options.doctorId || 'system',
        endpoint: options.endpoint || 'openai-chat-stream',
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
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const defaultOpenAIProvider = new OpenAIChatProvider("gpt-4o");
