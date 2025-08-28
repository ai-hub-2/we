import {promptExtra, ToolInfo} from "./prompt";
import {Messages} from "./action"
import {handleBuilderMode} from "./handlers/builderHandler"
import {handleChatMode} from "./handlers/chatHandler"
import { modelConfig } from "../model/config";

enum ChatMode {
    Chat = "chat",
    Builder = "builder",
}



interface ChatRequest {
    messages: Messages;
    model: string;
    mode: ChatMode;
    otherConfig: promptExtra
    tools?: ToolInfo[]
    userConfig?: {
        apiKey?: string;
        apiUrl?: string;
        provider?: string;
    }
}

export async function POST(request: Request) {
    try {
        const {
            messages,
            model,
            mode = ChatMode.Builder,
            otherConfig,
            tools,
            userConfig,
        } = (await request.json()) as ChatRequest;
        const userId = request.headers.get("userId");
        const result =
            mode === ChatMode.Chat
                ? await handleChatMode(messages, model, userId, tools, userConfig)
                : await handleBuilderMode(messages, model, userId, otherConfig, tools, userConfig)
        console.log(result, 'result');
        return result
    } catch (error) {
        console.log(error, "error");


        if (error instanceof Error && error.message?.includes("API key")) {
            return new Response("Invalid or missing API key", {status: 401});
        }
        return new Response(String(error.message), {status: 500});
    }
}

