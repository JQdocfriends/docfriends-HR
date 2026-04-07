/**
 * LLM Router - OpenAI 기반 라우팅
 * 
 * 전략:
 * 1. OpenAI 모델 사용
 * 2. 실패 시 에러 메시지 반환
 */

import type { 
  LLMProvider, 
  ChatMessage, 
  ChatCompletionOptions, 
  ChatCompletionResult,
  StreamChunk 
} from "./provider";
import { OpenAIChatProvider } from "./openai";

export type RoutingStrategy = "primary_fallback" | "round_robin" | "cost_optimized";

export interface RouterConfig {
  primaryProvider: "openai";
  strategy: RoutingStrategy;
  enableFallback: boolean;
}

const DEFAULT_CONFIG: RouterConfig = {
  primaryProvider: "openai",
  strategy: "primary_fallback",
  enableFallback: false,
};

export class LLMRouter implements LLMProvider {
  name = "router";
  private config: RouterConfig;
  private providers: Map<string, LLMProvider>;
  private healthStatus: Map<string, { healthy: boolean; lastCheck: number }>;
  private requestCount: number = 0;
  
  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.providers = new Map();
    this.healthStatus = new Map();
    
    this.providers.set("openai", new OpenAIChatProvider());
    
    this.healthStatus.set("openai", { healthy: true, lastCheck: 0 });
  }
  
  private getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }
  
  private async checkHealth(name: string): Promise<boolean> {
    const status = this.healthStatus.get(name);
    const now = Date.now();
    
    // Shorter cache time (5s) for faster recovery after errors
    if (status && now - status.lastCheck < 5000) {
      return status.healthy;
    }
    
    const provider = this.getProvider(name);
    if (!provider) return false;
    
    try {
      const healthy = await provider.isAvailable();
      this.healthStatus.set(name, { healthy, lastCheck: now });
      return healthy;
    } catch {
      this.healthStatus.set(name, { healthy: false, lastCheck: now });
      return false;
    }
  }
  
  private selectProviders(): string[] {
    return [this.config.primaryProvider];
  }
  
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    const providerOrder = this.selectProviders();
    let lastError: Error | null = null;
    
    for (const providerName of providerOrder) {
      const provider = this.getProvider(providerName);
      if (!provider) continue;
      
      const isHealthy = await this.checkHealth(providerName);
      if (!isHealthy) {
        console.log(`Skipping unhealthy provider: ${providerName}`);
        continue;
      }
      
      try {
        console.log(`Using provider: ${providerName}`);
        const result = await provider.chat(messages, options);
        return result;
      } catch (error: any) {
        lastError = error as Error;
        console.error(`Provider ${providerName} failed:`, {
          message: error?.message,
          name: error?.name,
          status: error?.status,
        });

        // Only mark unhealthy for infrastructure issues (timeouts, network), NOT for PHI/content blocks
        const isPHIBlock = error?.message?.includes("PHI_DETECTED");
        if (!isPHIBlock) {
          this.healthStatus.set(providerName, {
            healthy: false,
            lastCheck: Date.now()
          });
        }
      }
    }
    
    throw lastError || new Error("All LLM providers failed");
  }
  
  async *chatStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const providerOrder = this.selectProviders();
    
    for (const providerName of providerOrder) {
      const provider = this.getProvider(providerName);
      if (!provider) continue;
      
      const isHealthy = await this.checkHealth(providerName);
      if (!isHealthy) continue;
      
      try {
        console.log(`Streaming with provider: ${providerName}`);
        for await (const chunk of provider.chatStream(messages, options)) {
          yield chunk;
        }
        return;
      } catch (error: any) {
        console.error(`Stream provider ${providerName} failed:`, {
          message: error?.message,
          name: error?.name,
          status: error?.status,
        });
        const isPHIBlock = error?.message?.includes("PHI_DETECTED");
        if (!isPHIBlock) {
          this.healthStatus.set(providerName, {
            healthy: false,
            lastCheck: Date.now()
          });
        }
      }
    }

    yield {
      content: "죄송합니다. 현재 AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.",
      isDone: true 
    };
  }
  
  async isAvailable(): Promise<boolean> {
    const entries = Array.from(this.providers.entries());
    for (const [name] of entries) {
      if (await this.checkHealth(name)) {
        return true;
      }
    }
    return false;
  }
  
  getHealthStatus(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    const entries = Array.from(this.healthStatus.entries());
    for (const [name, status] of entries) {
      result[name] = status.healthy;
    }
    return result;
  }
}

export const llmRouter = new LLMRouter();
