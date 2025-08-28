import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  streamText as _streamText,
  convertToCoreMessages,
  generateObject,
} from "ai";

import type { LanguageModel, Message } from "ai";
import { modelConfig } from "../model/config";
import { createDeepSeek } from "@ai-sdk/deepseek";
export const MAX_TOKENS = 16000;

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], "model">;
let initOptions = {};
export function getOpenAIModel(baseURL: string, apiKey: string, model: string) {
  const provider = modelConfig.find(
    (item) => item.modelKey === model
  )?.provider;
  if (provider === "deepseek") {
    const deepseek = createDeepSeek({
      apiKey,
      baseURL,
    });
    initOptions = {}
    return deepseek(model);
  }
  if (provider.indexOf('claude') > -1) {
    const openai = createOpenAI({
      apiKey,
      baseURL,
    });
    initOptions = {
      maxTokens: provider.indexOf('claude-3-7-sonnet') > -1 ? 128000 : 8192,
    }
   return openai(model);
  }    
  
  const openai = createOpenAI({
    baseURL,
    apiKey,
  });
  initOptions = {};
  return openai(model);
}

export type Messages = Message[];

const defaultModel = getOpenAIModel(
  process.env.THIRD_API_URL,
  process.env.THIRD_API_KEY,
  "claude-3-5-sonnet-20240620"
) as LanguageModel;

export async function generateObjectFn(messages: Messages) {
  return generateObject({
    model: getOpenAIModel(
      process.env.THIRD_API_URL,
      process.env.THIRD_API_KEY,
      "gpt-4o-mini"
    ) as LanguageModel,
    schema: z.object({
      files: z.array(z.string()),
    }),
    messages: convertToCoreMessages(messages),
  });
}

export function streamTextFn(
  messages: Messages,
  options?: StreamingOptions,
  modelKey?: string,
  userConfig?: {
    apiKey?: string;
    apiUrl?: string;
    provider?: string;
  }
) {
  // Use user config if provided, otherwise fall back to environment variables
  const config = modelConfig.find((item) => item.modelKey === modelKey);
  const apiKey = userConfig?.apiKey || process.env.THIRD_API_KEY;
  const apiUrl = userConfig?.apiUrl || process.env.THIRD_API_URL;
  const provider = userConfig?.provider || config?.provider;
  
  if (!apiKey || !apiUrl) {
    throw new Error('API key and URL are required');
  }
  
  const model = getOpenAIModel(
    apiUrl,
    apiKey,
    modelKey 
  ) as LanguageModel;
  const newMessages = messages.map((item) => {
    if(item.role === 'assistant'){
      delete item.parts
    }
    return item
  })
  return _streamText({
    model: model || defaultModel,
    messages: convertToCoreMessages(newMessages),
    maxTokens: MAX_TOKENS,
    ...initOptions,
    ...options,
  });
}
