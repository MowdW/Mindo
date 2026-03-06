
import { MindoSettings, MindMapNode, MindMapEdge } from '../types';
import { cacheManager } from './aiCacheManager';
import { retryWithBackoff, parseJSON, formatErrorMessage } from './aiUtils';







// AI 头脑风暴功能
export interface BrainstormIdea {
  title: string;
  children?: BrainstormIdea[];
}

export interface BrainstormResult {
  ideas: BrainstormIdea[];
}

export const brainstorm = async (node: MindMapNode, settings: MindoSettings): Promise<BrainstormResult> => {
  // Check cache first
  const cacheKey = cacheManager.generateKey('brainstorm', { nodeId: node.id, title: node.title }, settings.aiModel || 'default');
  const cached = cacheManager.get<BrainstormResult>(cacheKey);
  if (cached) {
    console.log('brainstorm: using cached result');
    return cached;
  }

  if (!settings.aiApiKey) {
    throw new Error("缺少 API Key，请在 Mindo 设置中配置。");
  }

  const prompt = `作为创意 brainstorming 专家，请基于以下节点内容生成多级创意想法，最多3级，以深入探索问题：

节点标题：${node.title}
节点内容：${node.content || '无'}

要求：
1. 生成 3-5 个一级创意想法
2. 每个一级想法下生成 2-3 个二级子想法
3. 每个二级想法下可选择性生成 1-2 个三级子想法
4. 想法要具体、有创意，与节点内容相关
5. 语言简洁明了，重点突出

请返回一个严格的 JSON 对象，格式如下：
{
  "ideas": [
    {
      "title": "一级想法1",
      "children": [
        {
          "title": "二级想法1",
          "children": [
            {
              "title": "三级想法1"
            }
          ]
        }
      ]
    }
  ]
}`;

  try {
    let result: BrainstormResult | null = null;

    if (settings.aiProvider === 'gemini') {
      // Google Gemini Implementation
      const { GoogleGenAI, Type } = await import("@google/genai");
      result = await retryWithBackoff(async () => {
        const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
        const response = await ai.models.generateContent({
          model: settings.aiModel || 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                ideas: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      children: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            children: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  title: { type: Type.STRING }
                                },
                                required: ["title"]
                              }
                            }
                          },
                          required: ["title"]
                        }
                      }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["ideas"]
            }
          }
        });

        if (response.text) {
          const brainstormResult = parseJSON<BrainstormResult>(response.text, null);
          if (brainstormResult && Array.isArray(brainstormResult.ideas)) {
            return brainstormResult;
          }
        }
        throw new Error("Gemini 未返回有效数据");
      });

    } else {
      // OpenAI Compatible Implementation
      let baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
      if (!baseUrl.endsWith('/chat/completions')) {
           if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
           baseUrl = `${baseUrl}/chat/completions`;
      }

      result = await retryWithBackoff(async () => {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.aiApiKey}`
          },
          body: JSON.stringify({
            model: settings.aiModel || 'deepseek-chat',
            messages: [
              { role: "system", content: "你是一个专业的创意 brainstorming 专家，擅长基于给定主题生成创新的想法。请直接返回 JSON 对象格式的数据。" },
              { role: "user", content: prompt }
            ],
            stream: false,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`AI 服务提供商错误 (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          const brainstormResult = parseJSON<BrainstormResult>(content, null);
          if (brainstormResult && Array.isArray(brainstormResult.ideas)) {
            return brainstormResult;
          }
        }
        throw new Error("OpenAI-compatible 服务未返回有效数据");
      });
    }

    if (result) {
      // Cache the result
      cacheManager.set(cacheKey, result);
      return result;
    }

    throw new Error("无效的 AI 返回结果");
  } catch (error) {
    console.error("AI Brainstorm failed:", error);
    throw new Error(formatErrorMessage(error));
  }
};

// 内容深化功能
export const deepenContent = async (node: MindMapNode, settings: MindoSettings): Promise<string> => {
  // Check cache first
  const cacheKey = cacheManager.generateKey('deepenContent', { nodeId: node.id, title: node.title }, settings.aiModel || 'default');
  const cached = cacheManager.get<string>(cacheKey);
  if (cached) {
    console.log('deepenContent: using cached result');
    return cached;
  }

  if (!settings.aiApiKey) {
    throw new Error("缺少 API Key，请在 Mindo 设置中配置。");
  }

  const prompt = `作为内容深化专家，请基于以下节点内容生成更详细、更深入的内容：

节点标题：${node.title}
节点内容：${node.content || '无'}

要求：
1. 保持内容与原主题相关
2. 增加更多细节和深度
3. 提供更全面的信息
4. 保持内容结构清晰
5. 提炼主要内容，控制在200字以内
6. 语言简洁明了，重点突出

请直接返回深化后的内容文本，不需要任何 JSON 格式。`;

  try {
    let result: string | null = null;

    if (settings.aiProvider === 'gemini') {
      // Google Gemini Implementation
      const { GoogleGenAI } = await import("@google/genai");
      result = await retryWithBackoff(async () => {
        const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
        const response = await ai.models.generateContent({
          model: settings.aiModel || 'gemini-2.0-flash',
          contents: prompt
        });

        if (response.text) {
          return response.text.trim();
        }
        throw new Error("Gemini 未返回有效数据");
      });

    } else {
      // OpenAI Compatible Implementation
      let baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
      if (!baseUrl.endsWith('/chat/completions')) {
           if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
           baseUrl = `${baseUrl}/chat/completions`;
      }

      result = await retryWithBackoff(async () => {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.aiApiKey}`
          },
          body: JSON.stringify({
            model: settings.aiModel || 'deepseek-chat',
            messages: [
              { role: "system", content: "你是一个专业的内容深化专家，擅长为给定主题提供更详细、更深入的信息。请直接返回深化后的内容文本。" },
              { role: "user", content: prompt }
            ],
            stream: false,
            temperature: 0.5
          })
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`AI 服务提供商错误 (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          return content.trim();
        }
        throw new Error("OpenAI-compatible 服务未返回有效数据");
      });
    }

    if (result) {
      // Cache the result
      cacheManager.set(cacheKey, result);
      return result;
    }

    throw new Error("无效的 AI 返回结果");
  } catch (error) {
    console.error("AI Content Deepening failed:", error);
    throw new Error(formatErrorMessage(error));
  }
};
