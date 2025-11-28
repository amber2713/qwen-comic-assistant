document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const charCount = document.getElementById('charCount');
    const statusText = document.getElementById('statusText');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // API 配置
    const API_CONFIG = {
        apiKey: "sk-0ekO2NvdszHYBzlt4eC0F40913Fc4f5690141f6e1087818b",
        apiBase: "https://maas-api.cn-huabei-1.xf-yun.com/v1",
        modelId: "xop3qwen1b7"
    };
    
    // 支持 CORS 的代理列表
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://nameless-cove-83152.herokuapp.com/'
    ];
    
    // 系统提示，定义漫画家身份
    const SYSTEM_PROMPT = `你是一位资深漫画家，拥有20年的漫画创作经验。请始终以漫画家的身份回答用户的问题，保持专业、亲切且富有创意。`;

    // 初始化
    function init() {
        updateCharCount();
        checkAPIStatus();
        userInput.focus();
        
        // 添加示例问题按钮
        addExampleQuestions();
    }
    
    // 添加示例问题
    function addExampleQuestions() {
        const examples = [
            "如何设计一个有魅力的漫画角色？",
            "漫画分镜有什么技巧？",
            "新手如何开始画漫画？",
            "如何构思漫画故事情节？"
        ];
        
        const examplesHTML = examples.map(question => 
            `<button class="example-btn" onclick="addExampleQuestion('${question}')">${question}</button>`
        ).join('');
        
        const examplesDiv = document.createElement('div');
        examplesDiv.className = 'example-questions';
        examplesDiv.innerHTML = `<h3>试试这些问题：</h3>${examplesHTML}`;
        chatBox.appendChild(examplesDiv);
    }
    
    // 全局函数，用于示例按钮
    window.addExampleQuestion = function(question) {
        userInput.value = question;
        updateCharCount();
        userInput.focus();
    };
    
    // 更新字符计数
    function updateCharCount() {
        const count = userInput.value.length;
        charCount.textContent = count;
        
        if (count > 450) {
            charCount.style.color = '#ff4757';
        } else if (count > 400) {
            charCount.style.color = '#ffa502';
        } else {
            charCount.style.color = '#666';
        }
    }
    
    // 检查 API 状态
    async function checkAPIStatus() {
        try {
            statusText.textContent = 'API状态: 检查中...';
            
            // 简单的 API 测试请求
            const testResponse = await callQwenAPI('你好');
            if (testResponse && testResponse.length > 0) {
                statusText.textContent = 'API状态: 正常';
                document.querySelector('.status-dot').style.backgroundColor = '#4CAF50';
            } else {
                throw new Error('API 响应异常');
            }
        } catch (error) {
            console.warn('API 状态检查失败:', error);
            statusText.textContent = 'API状态: 使用演示模式';
            document.querySelector('.status-dot').style.backgroundColor = '#ffa502';
        }
    }
    
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
        updateCharCount();
        
        // 显示加载状态
        showLoading(true);
        
        // 调用 API 获取回复
        callQwenAPI(message)
            .then(response => {
                addMessage(response, 'bot');
            })
            .catch(error => {
                console.error('API 调用错误:', error);
                // 使用模拟回复作为备选
                const fallbackResponse = generateFallbackResponse(message);
                addMessage(fallbackResponse, 'bot');
            })
            .finally(() => {
                // 重新启用输入和按钮
                userInput.disabled = false;
                sendButton.disabled = false;
                userInput.focus();
                showLoading(false);
            });
    }
    
    // 添加消息到聊天框
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.textContent = sender === 'user' ? '你' : '漫';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        // 格式化内容，支持简单的 Markdown
        const formattedContent = formatMessage(content);
        contentDiv.innerHTML = formattedContent;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);
        
        // 滚动到底部
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // 格式化消息内容
    function formatMessage(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/- (.*?)(?=\n|$)/g, '• $1<br>');
    }
    
    // 显示/隐藏加载状态
    function showLoading(show) {
        if (show) {
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // 调用 Qwen API（使用代理解决 CORS）
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
            }
        };
        
        let lastError = null;
        
        // 尝试多个 CORS 代理
        for (const proxy of CORS_PROXIES) {
            try {
                console.log(`尝试代理: ${proxy}`);
                
                const targetURL = API_CONFIG.apiBase + '/chat/completions';
                const encodedURL = encodeURIComponent(targetURL);
                const proxyURL = proxy + encodedURL;
                
                const response = await fetch(proxyURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.choices && data.choices.length > 0) {
                    console.log('API 调用成功！');
                    return data.choices[0].message.content;
                } else {
                    throw new Error('API 返回格式异常');
                }
            } catch (error) {
                lastError = error;
                console.warn(`代理 ${proxy} 失败:`, error);
                // 继续尝试下一个代理
            }
        }
        
        // 所有代理都失败
        throw lastError || new Error('所有 CORS 代理都失败了');
    }
    
    // 生成备选回复（当 API 不可用时）
    function generateFallbackResponse(userMessage) {
        const responses = [
            `作为一位资深漫画家，关于"${userMessage}"这个问题，我认为在漫画创作中，最重要的是保持角色的个性化和故事的连贯性。在我的20年创作生涯中，我发现好的漫画往往来源于真实的情感和细致的观察。`,
            `感谢你的提问！${userMessage}这个问题让我想起了我早期创作时的经历。漫画艺术需要不断的实践和创新，每个漫画家都要找到属于自己的独特风格。`,
            `关于${userMessage}，从专业漫画家的角度来看，这涉及到角色设计、情节安排和视觉叙事等多个方面。我的建议是多研究经典作品，同时保持自己的创意。`,
            `在我20年的漫画生涯中，${userMessage}一直是创作者们关注的重点。我的经验是：保持热情，持续学习，勇于尝试新的表现手法。`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return randomResponse + "\n\n💡 提示：由于网络限制，当前使用演示模式。在理想环境下将连接真实的AI大模型。";
    }
    
    // 自动调整文本框高度
    function autoResizeTextarea() {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    }
    
    // 事件监听
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('input', function() {
        updateCharCount();
        autoResizeTextarea();
    });
    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 初始化应用
    init();
});
