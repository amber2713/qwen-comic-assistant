document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    
    // API配置
    const API_CONFIG = {
        apiKey: "sk-0ekO2NvdszHYBzlt4eC0F40913Fc4f5690141f6e1087818b",
        apiBase: "https://maas-api.cn-huabei-1.xf-yun.com/v1",
        modelId: "xop3qwen1b7"
    };
    
    // 系统提示，定义漫画家身份
    const SYSTEM_PROMPT = "你是一位资深漫画家，拥有20年的漫画创作经验。请以漫画家的身份回答用户的问题，分享你的专业知识和创作经验。回答时要亲切、专业，并适当加入个人创作经历。请保持回答简洁明了，直接针对用户的问题进行回答。";
    
    // 发送消息函数
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // 禁用输入和按钮
        userInput.disabled = true;
        sendButton.disabled = true;
        
        // 添加用户消息到聊天框
        addMessage(message, 'user');
        userInput.value = '';
        
        // 显示正在输入指示器
        showTypingIndicator();
        
        // 调用API获取回复
        callQwenAPI(message)
            .then(response => {
                removeTypingIndicator();
                addMessage(response, 'bot');
            })
            .catch(error => {
                removeTypingIndicator();
                addMessage(`抱歉，我现在无法回答您的问题。错误信息: ${error.message}`, 'bot', true);
                console.error('API调用错误:', error);
            })
            .finally(() => {
                // 重新启用输入和按钮
                userInput.disabled = false;
                sendButton.disabled = false;
                userInput.focus();
            });
    }
    
    // 添加消息到聊天框
    function addMessage(content, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.textContent = sender === 'user' ? '你' : '漫';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        if (isError) {
            contentDiv.classList.add('error-message');
        }
        
        // 使用marked.js解析Markdown格式
        const formattedContent = marked.parse(content);
        
        contentDiv.innerHTML = formattedContent;
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatBox.appendChild(messageDiv);
        
        // 滚动到底部
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // 显示正在输入指示器
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typingIndicator';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.textContent = '漫';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingIndicator.appendChild(dot);
        }
        
        contentDiv.appendChild(typingIndicator);
        typingDiv.appendChild(avatarDiv);
        typingDiv.appendChild(contentDiv);
        
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // 移除正在输入指示器
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // 调用Qwen API
    async function callQwenAPI(userMessage) {
        const requestBody = {
            model: API_CONFIG.modelId,
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            stream: false,
            temperature: 0.7,
            max_tokens: 1024,
            extra_headers: {
                "lora_id": "0"
            },
            extra_body: {}
        };
        
        const response = await fetch(API_CONFIG.apiBase + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error('API返回格式异常');
        }
    }
    
    // 事件监听
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 初始焦点在输入框
    userInput.focus();
    
    // 初始演示消息
    setTimeout(() => {
        addMessage('欢迎使用漫画家AI助手！我是拥有20年漫画创作经验的资深漫画家，可以为您解答关于漫画创作、角色设计、故事构思等方面的问题。', 'bot');
    }, 500);
});