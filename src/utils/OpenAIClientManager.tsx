import OpenAI from "openai";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


// 定义OpenAIClientManager类
class OpenAIClientManager {
  // 定义单例模式
  private static instance: OpenAIClientManager;
  // 定义OpenAI客户端
  private client: OpenAI | null = null;

  // 私有构造函数，防止外部实例化
  private constructor() {}

  // 获取单例实例
  public static getInstance(): OpenAIClientManager {
    if (!OpenAIClientManager.instance) {
      OpenAIClientManager.instance = new OpenAIClientManager();
    }
    return OpenAIClientManager.instance;
  }

  // 初始化OpenAI客户端
  public initializeClient(apiKey: string, customFetch?: typeof window.fetch, baseUrl?: string ) {
    this.client = new OpenAI({
      baseURL: baseUrl || API_BASE_URL,
      apiKey,
      dangerouslyAllowBrowser: true,
      fetch: customFetch,
    });
  }

  // 获取OpenAI客户端
  public getClient(): OpenAI {
    if (!this.client) {
      throw new Error("OpenAI client is not initialized.");
    }
    return this.client;
  }

  // 更新API密钥
  public updateApiKey(newApiKey: string,  customFetch?: typeof window.fetch, baseUrl?: string) {
    this.client = null; // 销毁旧实例
    this.initializeClient(newApiKey, customFetch, baseUrl); // 创建新实例
  }
}

// 导出OpenAIClientManager类
export default OpenAIClientManager;