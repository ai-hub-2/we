import {v4 as uuidv4} from "uuid";
import {Messages, StreamingOptions, streamTextFn} from "../action";
import {CONTINUE_PROMPT, ToolInfo} from "../prompt";
import {deductUserTokens, estimateTokens} from "@/utils/tokens";
import SwitchableStream from "../switchable-stream";
import {tool} from "ai";
import {jsonSchemaToZodSchema} from "@/app/api/chat/utils/json2zod";

const MAX_RESPONSE_SEGMENTS = 2;

export async function streamResponse(
    messages: Messages,
    model: string,
    userId: string | null,
    tools?: ToolInfo[],
    userConfig?: {
        apiKey?: string;
        apiUrl?: string;
        provider?: string;
    }
): Promise<Response> {
    let toolList = {};
    if (tools && tools.length > 0) {
        toolList = tools.reduce((obj, {name, ...args}) => {
            obj[name] = tool({
                id: args.id,
                description: args.description,
                parameters:  jsonSchemaToZodSchema(args.parameters)
            });
            return obj;
        }, {});
    }
    const stream = new SwitchableStream();
    const options: StreamingOptions = {
        tools: toolList,
        toolCallStreaming: true,
        onError: (err: any) => {
            // 获取错误信息，优先使用 cause 属性
            const errorCause = err?.cause?.message || err?.cause || err?.error?.message
            const msg = errorCause || err?.errors?.[0]?.responseBody || JSON.stringify(err);

            if (msg) {
                throw new Error(msg);
            }
            const error = new Error(msg || JSON.stringify(err));
            error.cause = msg; // 保存原始错误信息到 cause
            throw error;
        },
        onFinish: async (response) => {
            const {text: content, finishReason} = response;

            if (finishReason !== "length") {
                const tokens = estimateTokens(content);
                if (userId) {
                    await deductUserTokens(userId, tokens);
                }
                return stream.close();
            }

            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
                throw Error("Cannot continue message: Maximum segments reached");
            }

            messages.push({id: uuidv4(), role: "assistant", content});
            messages.push({id: uuidv4(), role: "user", content: CONTINUE_PROMPT});
        },
    };

    try {
        const result = streamTextFn(messages, options, model, userConfig);
        return result.toDataStreamResponse({
            sendReasoning: true,
        });
    } catch (error: any) {
        // 确保流被关闭
        stream.close();
        // 如果错误中包含 cause，将其作为新错误抛出
        if (error.cause) {
            const newError = new Error(error.cause);
            newError.cause = error.cause;
            throw newError;
        }
        stream.close();
        throw error;
    }
}