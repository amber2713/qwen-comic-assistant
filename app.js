// 聊天状态管理
class ChatState {
    constructor() {
        this.messages = [{
            role: "assistant",
            content: CONFIG.WELCOME_MESSAGE,
            timestamp: new Date()
        }];
        this.isGenerating = false;
        this.currentStream = null;
    }

    addMessage(role, content) {
        const message = {
            role,
            content,
            timestamp: new Date()
        };
        this.messages.push(message);
        this.saveToLocalStorage();
        return message;
    }

    getMessagesForAPI() {
        return this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    getTokenCount() {
        return this.messages.reduce((total, msg) => total + msg.content.length, 0);
    }

    // 移除 updateTokenDisplay 调用，只做token检查
    checkTokenLimit() {
        while (this.getTokenCount() > CONFIG.MAX_TOKENS && this.messages.length > 1) {
            this.messages.splice(1, 1); // 保留第一条欢迎消息
        }
        // 注意：这里不再调用 updateTokenDisplay，让外部调用者处理
    }

    clear() {
        this.messages = [{
            role: "assistant",
            content: CONFIG.WELCOME_MESSAGE,
            timestamp: new Date()
        }];
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('qwen_chat_history', JSON.stringify(this.messages));
        } catch (e) {
            console.warn('本地存储失败:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('qwen_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 确保至少有一条消息
                this.messages = parsed.length > 0 ? parsed : [{
                    role: "assistant",
                    content: CONFIG.WELCOME_MESSAGE,
                    timestamp: new Date()
                }];
            }
        } catch (e) {
            console.warn('读取本地存储失败:', e);
        }
    }
}

// API客户端
class APIClient {
    constructor() {
        this.chatState = new ChatState();
    }

    async sendMessage(messageText) {
        if (this.chatState.isGenerating) {
            alert('请等待AI回复完成后再发送新消息');
            return;
        }

        // 添加用户消息
        const userMessage = this.chatState.addMessage("user", messageText);
        this.displayMessage(userMessage);

        // 检查token限制
        this.chatState.checkTokenLimit();
        this.updateTokenDisplay();  // 在这里更新token显示

        // 显示AI消息占位符
        const aiMessage = this.chatState.addMessage("assistant", "");
        const aiMessageElement = this.displayMessage(aiMessage, true);

        // 设置加载状态
        this.chatState.isGenerating = true;
        this.showLoading(true);

        try {
            // 准备API请求
            const response = await fetch(CONFIG.HTTP_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': CONFIG.API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL_ID,
                    user: "user_id",
                    messages: this.chatState.getMessagesForAPI(),
                    stream: CONFIG.STREAM
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const text = data.choices[0].delta.content;
                                fullResponse += text;
                                
                                // 更新显示
                                aiMessageElement.querySelector('.text').innerHTML = 
                                    this.formatMessage(fullResponse);
                                
                                // 滚动到底部
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            console.warn('解析数据失败:', e);
                        }
                    }
                }
            }

            // 更新消息内容
            const lastIndex = this.chatState.messages.length - 1;
            this.chatState.messages[lastIndex].content = fullResponse;
            this.chatState.saveToLocalStorage();

        } catch (error) {
            console.error('API调用错误:', error);
            
            // 显示错误信息
            aiMessageElement.querySelector('.text').innerHTML = 
                `<span style="color: #ff4757">错误: ${error.message}</span>`;
            
            const lastIndex = this.chatState.messages.length - 1;
            this.chatState.messages[lastIndex].content = `错误: ${error.message}`;
            
        } finally {
            // 清理状态
            this.chatState.isGenerating = false;
            this.showLoading(false);
            this.updateTokenDisplay();  // 完成后更新token显示
        }
    }

    displayMessage(message, isPlaceholder = false) {
        const container = document.getElementById('chatContainer');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${message.role === 'user' ? 'user' : 'ai'}`;
        
        const timeStr = message.timestamp ? 
            this.formatTime(message.timestamp) : 
            new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageElement.innerHTML = `
            <div class="avatar">${message.role === 'user' ? '你' : 'AI'}</div>
            <div class="content">
                <div class="text">${isPlaceholder ? '思考中...' : this.formatMessage(message.content)}</div>
                <div class="time">${timeStr}</div>
            </div>
        `;
        
        container.appendChild(messageElement);
        this.scrollToBottom();
        
        return messageElement;
    }

    formatMessage(text) {
        if (!text) return '';
        // 简单的Markdown支持
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    formatTime(date) {
        const now = new Date();
        const msgDate = new Date(date);
        
        if (now.toDateString() === msgDate.toDateString()) {
            return msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            return msgDate.toLocaleDateString([], {month: 'short', day: 'numeric'}) + 
                   ' ' + msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    }

    scrollToBottom() {
        const container = document.getElementById('chatContainer');
        container.scrollTop = container.scrollHeight;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const sendBtn = document.querySelector('.send-btn');
        
        if (show) {
            loading.classList.add('active');
            sendBtn.disabled = true;
        } else {
            loading.classList.remove('active');
            sendBtn.disabled = false;
        }
    }

    updateTokenDisplay() {
        const tokenCount = document.getElementById('tokenCount');
        if (!tokenCount) return;
        
        const count = this.chatState.getTokenCount();
        const percentage = Math.min(100, (count / CONFIG.MAX_TOKENS) * 100);
        
        let color = '#4CAF50';
        if (percentage > 70) color = '#FFC107';
        if (percentage > 90) color = '#FF5252';
        
        tokenCount.textContent = `长度: ${count} (${Math.round(percentage)}%)`;
        tokenCount.style.color = color;
    }
}

// 全局应用实例
let app = null;

// 辅助函数
function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;
    
    input.value = '';
    autoResize(input);
    
    if (app) {
        app.sendMessage(message);
    }
}

function newChat() {
    if (confirm('确定要开始新对话吗？当前对话历史将被清除。')) {
        if (app && app.chatState) {
            app.chatState.clear();
            const container = document.getElementById('chatContainer');
            if (container) {
                container.innerHTML = '';
            }
            app.displayMessage(app.chatState.messages[0]);
            app.updateTokenDisplay();
        }
    }
}

function clearChat() {
    if (confirm('确定要清空所有对话历史吗？')) {
        localStorage.removeItem('qwen_chat_history');
        newChat();
    }
}

function exportChat() {
    if (!app || !app.chatState.messages.length) {
        alert('没有对话内容可导出');
        return;
    }
    
    let exportText = `=== Qwen对话导出 ===\n时间: ${new Date().toLocaleString()}\n\n`;
    
    app.chatState.messages.forEach(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI助手';
        const time = app.formatTime(msg.timestamp);
        exportText += `[${time}] ${role}:\n${msg.content}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qwen-chat-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 创建应用实例
    app = new APIClient();
    
    // 加载历史记录
    app.chatState.loadFromLocalStorage();
    
    // 显示历史消息
    const container = document.getElementById('chatContainer');
    if (container) {
        container.innerHTML = '';
        app.chatState.messages.forEach(msg => {
            app.displayMessage(msg);
        });
    }
    
    // 更新token显示
    app.updateTokenDisplay();
    
    // 聚焦输入框
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.focus();
    }
    
    console.log('Qwen聊天助手已初始化');
});
