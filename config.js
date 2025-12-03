// API配置 - 直接使用你的API信息
const CONFIG = {
    // HTTP API配置
    HTTP_ENDPOINT: "https://maas-api.cn-huabel-1.xf-yun.com/v1/chat/completions",
    API_KEY: "Bearer sk-qiXqtAli5QEGrK0bD90e79",
    
    // WebSocket配置（备用）
    WS_ENDPOINT: "wss://maas-api.cn-huabel-1.xf-yun.com/v1.1/chat",
    APP_ID: "c38616d6",
    WS_API_KEY: "c565180e3968c338b6ae9de",
    API_SECRET: "NGM52DYZZWEIZTlhODkOGFmM2RIMGFm",
    
    // 模型配置
    MODEL_ID: "xop3qwen1b7",
    SERVICE_NAME: "random wander",
    
    // 应用设置
    MAX_TOKENS: 8000,
    STREAM: true,
    
    // 界面配置
    APP_NAME: "Qwen3-1.7B对话助手",
    WELCOME_MESSAGE: "你好！我是基于Qwen3-1.7B模型的智能助手。我可以回答各种问题、进行对话交流、提供建议等。有什么可以帮助您的吗？"
};

// 导出配置
window.CONFIG = CONFIG;
