import { NextResponse } from "next/server";
import { modelConfig } from "./config";

interface ModelRequest {
    provider?: string;
    apiKey?: string;
    apiUrl?: string;
}

// 获取模型配置, 可以迁移到配置中心
export async function POST(request: Request) {
    try {
        const body: ModelRequest = await request.json();
        const { provider, apiKey, apiUrl } = body;
        
        // If user provided specific provider config, filter models for that provider
        if (provider && apiKey && apiUrl) {
            const filteredConfig = modelConfig.filter(item => item.provider === provider);
            const config = filteredConfig.map(item => {
                return {
                    label: item.modelName,
                    value: item.modelKey,
                    useImage: item.useImage,
                    description: item.description,
                    icon: item.iconUrl,
                    provider: item.provider,
                    functionCall: item.functionCall,
                }
            });
            return NextResponse.json(config);
        }
        
        // Return all models if no specific provider config
        const config = modelConfig.map(item => {
            return {
                label: item.modelName,
                value: item.modelKey,
                useImage: item.useImage,
                description: item.description,
                icon: item.iconUrl,
                provider: item.provider,
                functionCall: item.functionCall,
            }
        });
        return NextResponse.json(config);
    } catch (error) {
        console.error('Error in model endpoint:', error);
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}
