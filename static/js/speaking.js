// 口语练习页面JavaScript
let currentLevel = null;
let conversationHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentAIVoice = null; // 当前AI语音的音频URL
let currentAIMessage = null; // 当前AI消息文本
let messageAudios = new Map(); // 存储每条消息的音频URL
let currentVoice = 'en-US-JennyNeural'; // 当前选择的TTS语音

// DOM 元素
const levelSelector = document.getElementById('levelSelector');
const speakingContent = document.getElementById('speakingContent');
const levelsGrid = document.getElementById('levelsGrid');
const conversationMessages = document.getElementById('conversationMessages');
let conversationContainer = null; // 滚动容器，将在初始化时获取
const recordingStatus = document.getElementById('recordingStatus');
const currentLevelBadge = document.getElementById('currentLevelBadge');
const voiceSelect = document.getElementById('voiceSelect');
const unifiedActionBtn = document.getElementById('unifiedActionBtn');
const actionIcon = document.getElementById('actionIcon');
const actionText = document.getElementById('actionText');
const userTextInput = document.getElementById('userTextInput');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadLevels();
    loadVoices();
    checkMicrophonePermission();
    updateTipsMessage();
    setupTextInput();
    setupAutoScroll(); // 设置自动滚动
});

// 设置文本输入框（支持Enter键发送）
function setupTextInput() {
    if (userTextInput) {
        // 支持 Shift+Enter 换行，Enter 发送
        userTextInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUnifiedAction();
            }
        });
        
        // 监听输入变化，更新按钮状态
        userTextInput.addEventListener('input', updateUnifiedButtonState);
        userTextInput.addEventListener('focus', updateUnifiedButtonState);
        userTextInput.addEventListener('blur', updateUnifiedButtonState);
        
        // 初始化按钮状态
        updateUnifiedButtonState();
    }
}

// 更新统一按钮状态
function updateUnifiedButtonState() {
    if (!unifiedActionBtn || !userTextInput || !actionIcon || !actionText) return;
    
    const hasText = userTextInput.value.trim().length > 0;
    
    if (hasText) {
        // 有文本时，显示发送功能
        actionIcon.textContent = '📤';
        actionText.textContent = '发送';
        unifiedActionBtn.classList.remove('recording-mode');
        unifiedActionBtn.classList.add('send-mode');
    } else {
        // 无文本时，显示录音功能
        if (isRecording) {
            actionIcon.textContent = '⏹️';
            actionText.textContent = '停止录音';
            unifiedActionBtn.classList.add('recording');
        } else {
            actionIcon.textContent = '🎤';
            actionText.textContent = '开始录音';
            unifiedActionBtn.classList.remove('recording', 'send-mode');
            unifiedActionBtn.classList.add('recording-mode');
        }
    }
}

// 统一操作处理函数
async function handleUnifiedAction() {
    if (!userTextInput) return;
    
    const hasText = userTextInput.value.trim().length > 0;
    
    if (hasText) {
        // 有文本时，执行发送功能
        await sendTextMessage();
    } else {
        // 无文本时，执行录音功能
        await toggleRecording();
    }
}

// 更新提示信息
function updateTipsMessage() {
    const tipsArea = document.getElementById('tipsArea');
    if (!tipsArea) return;
    
    const isSecureContext = window.isSecureContext || 
                           location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1' ||
                           location.hostname === '[::1]';
    
    if (!isSecureContext) {
        tipsArea.innerHTML = `
            <p style="color: #ff6b6b; font-weight: bold;">⚠️ 当前环境不支持麦克风功能</p>
            <p>💡 提示：麦克风功能需要在以下环境下使用：</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>使用 <strong>https://</strong> 协议访问</li>
                <li>使用 <strong>localhost</strong> 或 <strong>127.0.0.1</strong> 访问</li>
            </ul>
            <p>📝 如果无法使用麦克风，可以使用页面下方的文本输入框继续练习。</p>
        `;
    }
}

// 检查麦克风权限和支持情况
async function checkMicrophonePermission() {
    // 检查是否在安全上下文中（HTTPS或localhost）
    const isSecureContext = window.isSecureContext || 
                           location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1' ||
                           location.hostname === '[::1]';
    
    // 检查浏览器是否支持 getUserMedia
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasLegacyAPI = navigator.getUserMedia || 
                        navigator.webkitGetUserMedia || 
                        navigator.mozGetUserMedia || 
                        navigator.msGetUserMedia;
    
    if (!isSecureContext) {
        console.warn('当前环境不支持麦克风访问：需要使用HTTPS或localhost访问');
        showMicrophoneWarning('当前环境不支持麦克风访问。\n\n请使用以下方式之一访问：\n1. 使用 https:// 协议\n2. 使用 localhost 或 127.0.0.1 访问\n3. 使用文本输入方式继续练习');
        enableTextInput();
        return;
    }
    
    if (!hasMediaDevices && !hasLegacyAPI) {
        console.warn('浏览器不支持麦克风访问');
        showMicrophoneWarning('您的浏览器不支持麦克风访问功能。\n\n请使用现代浏览器（Chrome、Firefox、Edge等），或使用文本输入方式继续练习。');
        enableTextInput();
        return;
    }
    
    // 尝试检查权限（但不强制要求）
    try {
        if (hasMediaDevices) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log('麦克风权限已授予');
        } else if (hasLegacyAPI) {
            // 使用旧版 API（需要 Promise 包装）
            return new Promise((resolve) => {
                const getUserMedia = navigator.getUserMedia || 
                                    navigator.webkitGetUserMedia || 
                                    navigator.mozGetUserMedia || 
                                    navigator.msGetUserMedia;
                getUserMedia.call(navigator, { audio: true }, 
                    (stream) => {
                        stream.getTracks().forEach(track => track.stop());
                        console.log('麦克风权限已授予（旧版API）');
                        resolve();
                    },
                    (error) => {
                        console.warn('麦克风权限检查失败（旧版API）:', error);
                        resolve();
                    }
                );
            });
        }
    } catch (error) {
        console.warn('麦克风权限检查失败:', error);
        // 不显示错误提示，允许用户继续使用（可能在点击录音时再提示）
    }
}

// 显示麦克风警告
function showMicrophoneWarning(message) {
    // 只在控制面板区域显示警告，不阻塞用户
    const controlPanel = document.querySelector('.control-panel');
    if (controlPanel && !document.getElementById('micWarning')) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'micWarning';
        warningDiv.className = 'mic-warning';
        warningDiv.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">${message.replace(/\n/g, '<br>')}</div>
        `;
        controlPanel.insertBefore(warningDiv, controlPanel.firstChild);
    }
}

// 启用文本输入模式
function enableTextInput() {
    const recordBtn = document.getElementById('recordBtn');
    const textInputArea = document.getElementById('textInputArea');
    
    if (recordBtn) {
        recordBtn.style.display = 'none';
    }
    
    if (!textInputArea) {
        // 创建文本输入区域
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            const textInputDiv = document.createElement('div');
            textInputDiv.id = 'textInputArea';
            textInputDiv.className = 'text-input-area';
            textInputDiv.innerHTML = `
                <textarea id="userTextInput" placeholder="在此输入你的回答（英文）..." rows="3"></textarea>
                <button class="action-btn" onclick="submitTextInput()">发送</button>
            `;
            controlPanel.appendChild(textInputDiv);
        }
    }
}

// 加载等级列表
async function loadLevels() {
    try {
        const response = await fetch('/api/english/speaking/levels');
        if (!response.ok) {
            throw new Error('加载等级列表失败');
        }
        const levels = await response.json();
        displayLevels(levels);
    } catch (error) {
        console.error('加载等级列表错误:', error);
        alert('加载等级列表失败，请刷新页面重试');
    }
}

// 显示等级列表
function displayLevels(levels) {
    levelsGrid.innerHTML = '';
    levels.forEach(level => {
        const levelCard = document.createElement('div');
        levelCard.className = 'level-card';
        levelCard.innerHTML = `
            <h3>${level.name}</h3>
            <p>${level.description}</p>
            <button class="select-level-btn" onclick="selectLevel('${level.id}')">选择</button>
        `;
        levelsGrid.appendChild(levelCard);
    });
}

// 加载语音列表
async function loadVoices() {
    try {
        const response = await fetch('/api/english/voices');
        if (!response.ok) {
            throw new Error('加载语音列表失败');
        }
        const voices = await response.json();
        displayVoices(voices);
    } catch (error) {
        console.error('加载语音列表错误:', error);
        // 使用默认语音
        if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="en-US-JennyNeural">Jenny (Female) - 默认</option>';
        }
    }
}

// 显示语音列表
function displayVoices(voices) {
    if (!voiceSelect) return;
    
    voiceSelect.innerHTML = '';
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = voice.name;
        if (voice.id === currentVoice) {
            option.selected = true;
        }
        voiceSelect.appendChild(option);
    });
    
    // 添加事件监听器
    voiceSelect.addEventListener('change', (e) => {
        currentVoice = e.target.value;
        console.log('选择的语音:', currentVoice);
    });
}

// 选择等级
function selectLevel(levelId) {
    currentLevel = levelId;
    const levelNames = {
        'beginner': '初级',
        'elementary': '初级进阶',
        'intermediate': '中级',
        'advanced': '高级'
    };
    currentLevelBadge.textContent = levelNames[levelId] || levelId;
    
    levelSelector.style.display = 'none';
    speakingContent.style.display = 'block';
    
    // 开始新对话
    startNewConversation();
}

// 显示等级选择器
function showLevelSelector() {
    levelSelector.style.display = 'block';
    speakingContent.style.display = 'none';
    conversationHistory = [];
    conversationMessages.innerHTML = '';
}

// 开始新对话
async function startNewConversation() {
    // 弹出对话框让用户输入话题
    const topic = prompt('请输入你想要练习的话题（例如：daily life, hobbies, travel等），留空则使用默认话题：', '');
    
    // 清空对话历史
    conversationHistory = [];
    conversationMessages.innerHTML = '';
    currentAIVoice = null;
    currentAIMessage = null;
    
    // 清理所有音频URL
    messageAudios.forEach(url => {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    messageAudios.clear();
    
    // 清空文本输入框
    const textInput = document.getElementById('userTextInput');
    if (textInput) {
        textInput.value = '';
    }
    
    // 生成初始对话
    await generateConversation(topic ? topic.trim() : '');
}

// 生成对话
async function generateConversation(topic = '', userInput = null) {
    try {
        const startTime = performance.now();
        showLoadingMessage();
        
        // 构建请求数据
        const requestData = {
            level: currentLevel,
            topic: topic,
            history: conversationHistory
        };
        
        // 如果有用户输入，添加到请求中
        if (userInput) {
            requestData.user_input = userInput;
        } else if (topic) {
            // 如果是新话题，使用话题作为初始输入
            requestData.user_input = `Let's talk about ${topic}`;
        }
        
        const response = await fetch('/api/english/speaking/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '生成对话失败');
        }
        
        const apiTime = performance.now() - startTime;
        console.log(`[性能] API调用耗时: ${(apiTime / 1000).toFixed(2)}秒`);
        
        const result = await response.json();
        const aiMessage = result.message;
        const aiTranslation = result.translation || '';
        
        // 添加到对话历史
        conversationHistory.push({
            role: 'assistant',
            content: aiMessage
        });
        
        // 移除加载消息
        removeLoadingMessage();
        
        const displayTime = performance.now() - startTime;
        console.log(`[性能] 显示消息耗时: ${(displayTime / 1000).toFixed(2)}秒`);
        
        // 先显示AI消息（不等待语音生成）
        addMessage('assistant', aiMessage, null, aiTranslation);
        // 确保滚动到底部（多次滚动确保可靠，因为内容可能异步加载）
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 150);
        setTimeout(scrollToBottom, 300);
        
        // 异步生成AI语音（不阻塞显示）
        generateAIVoice(aiMessage).then(aiAudioUrl => {
            if (aiAudioUrl) {
                // 更新消息，添加音频播放按钮
                const messageId = conversationMessages.lastElementChild?.id;
                if (messageId) {
                    messageAudios.set(messageId, aiAudioUrl);
                    // 更新按钮
                    const messageContent = document.querySelector(`#${messageId} .message-content`);
                    if (messageContent) {
                        let actionsDiv = messageContent.querySelector('.message-actions');
                        
                        // 如果按钮容器不存在，创建它
                        if (!actionsDiv) {
                            const messageTextLine = messageContent.querySelector('.message-text-line');
                            if (messageTextLine) {
                                actionsDiv = document.createElement('div');
                                actionsDiv.className = 'message-actions';
                                messageTextLine.appendChild(actionsDiv);
                            }
                        }
                        
                        if (actionsDiv) {
                            // 检查是否已有播放按钮，避免重复添加
                            const existingPlayBtn = actionsDiv.querySelector('.message-action-btn[title="播放音频"]');
                            if (!existingPlayBtn) {
                                // 添加播放按钮
                                const playBtn = document.createElement('button');
                                playBtn.className = 'message-action-btn';
                                playBtn.onclick = () => playMessageAudio(messageId);
                                playBtn.title = '播放音频';
                                playBtn.textContent = '🔊';
                                actionsDiv.insertBefore(playBtn, actionsDiv.firstChild);
                            }
                        }
                    }
                }
                
                // 确保滚动到底部（按钮添加后，多次滚动确保可靠）
                setTimeout(scrollToBottom, 10);
                setTimeout(scrollToBottom, 50);
                setTimeout(scrollToBottom, 150);
                
                // 自动播放AI语音
                setTimeout(() => {
                    playMessageAudioByUrl(aiAudioUrl);
                }, 100);
            }
        }).catch(error => {
            console.error('生成AI语音失败:', error);
        });
        
    } catch (error) {
        console.error('生成对话错误:', error);
        removeLoadingMessage();
        alert('生成对话失败: ' + error.message);
    }
}

// 显示加载消息
function showLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message message-assistant message-loading';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    conversationMessages.appendChild(loadingDiv);
    scrollToBottom();
}

// 移除加载消息
function removeLoadingMessage() {
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

// 添加消息到对话
function addMessage(role, content, audioUrl = null, translation = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    messageDiv.id = messageId;
    
    // 生成按钮HTML
    let buttonsHtml = '';
    
    // 播放按钮（如果有音频）
    if (audioUrl) {
        messageAudios.set(messageId, audioUrl);
        buttonsHtml += `
            <button class="message-action-btn" onclick="playMessageAudio('${messageId}')" title="播放音频">
                🔊
            </button>
        `;
    }
    
    // 翻译切换按钮（AI消息总是显示翻译按钮）
    if (role === 'assistant') {
        buttonsHtml += `
            <button class="message-action-btn translation-toggle-btn" id="translationBtn-${messageId}" onclick="toggleTranslation('${messageId}')" title="显示/隐藏中文翻译" ${translation ? '' : 'style="opacity: 0.5;"'}>
                🇨🇳
            </button>
        `;
    }
    
    // 生成翻译HTML（默认隐藏）
    let translationHtml = '';
    if (role === 'assistant') {
        if (translation && translation.trim()) {
            translationHtml = `
                <div class="message-translation" id="translation-${messageId}" style="display: none;">
                    <div class="translation-label">中文翻译：</div>
                    <div class="translation-text">${escapeHtml(translation)}</div>
                </div>
            `;
        } else {
            // 如果没有翻译，不显示翻译容器（但保留按钮，以便后续可能更新）
            // 不显示"翻译生成中"，因为翻译应该在AI回复时就已经生成
            translationHtml = `
                <div class="message-translation" id="translation-${messageId}" style="display: none;">
                    <div class="translation-label">中文翻译：</div>
                    <div class="translation-text" id="translationText-${messageId}">暂无翻译</div>
                </div>
            `;
        }
    }
    
    if (role === 'assistant') {
        // AI消息：始终创建按钮容器（因为总是有翻译按钮）
        messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-text-wrapper">
                    <div class="message-text-line">
                        <div class="message-text">${escapeHtml(content)}</div>
                        <div class="message-actions">${buttonsHtml}</div>
                    </div>
                    ${translationHtml}
                </div>
            </div>
        `;
    } else {
        // 用户消息：只在有按钮时创建容器
        messageDiv.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">
                <div class="message-text-line">
                    <div class="message-text">${escapeHtml(content)}</div>
                    ${buttonsHtml ? `<div class="message-actions">${buttonsHtml}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    conversationMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 设置自动滚动（使用 MutationObserver 监听 DOM 变化）
function setupAutoScroll() {
    if (!conversationMessages) return;
    
    // 获取滚动容器（有 overflow-y: auto 的父元素）
    conversationContainer = conversationMessages.parentElement;
    
    // 如果找不到，尝试通过 class 查找
    if (!conversationContainer || !conversationContainer.classList.contains('conversation-container')) {
        conversationContainer = document.querySelector('.conversation-container');
    }
    
    // 如果还是找不到，使用 conversationMessages 本身
    if (!conversationContainer) {
        conversationContainer = conversationMessages;
    }
    
    // 使用 MutationObserver 监听消息容器的变化
    const observer = new MutationObserver(() => {
        // 当有新内容添加时，自动滚动到底部
        scrollToBottom();
    });
    
    // 监听子节点的添加和属性变化
    observer.observe(conversationMessages, {
        childList: true,        // 监听子节点的添加和删除
        subtree: true,          // 监听所有后代节点
        attributes: true,       // 监听属性变化（如 style 变化）
        attributeFilter: ['style', 'class'] // 只监听 style 和 class 属性
    });
    
    // 也监听滚动容器本身的变化（以防万一）
    if (conversationContainer !== conversationMessages) {
        observer.observe(conversationContainer, {
            childList: true,
            subtree: true
        });
    }
}

// 滚动到底部（使用正确的滚动容器）
function scrollToBottom() {
    // 如果 conversationContainer 还没有初始化，尝试初始化它
    if (!conversationContainer && conversationMessages) {
        conversationContainer = conversationMessages.parentElement;
        if (!conversationContainer || !conversationContainer.classList.contains('conversation-container')) {
            conversationContainer = document.querySelector('.conversation-container');
        }
        if (!conversationContainer) {
            conversationContainer = conversationMessages;
        }
    }
    
    // 使用 conversationContainer 作为滚动容器（有 overflow-y: auto 的那个）
    const scrollElement = conversationContainer || conversationMessages;
    if (!scrollElement) return;
    
    // 强制滚动到底部的函数
    const forceScroll = () => {
        if (!scrollElement) return;
        
        // 方法1: 直接设置 scrollTop（最可靠的方法）
        const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight;
        scrollElement.scrollTop = scrollElement.scrollHeight;
        
        // 方法2: 使用 scrollTo（如果支持）
        if (scrollElement.scrollTo) {
            try {
                scrollElement.scrollTo({
                    top: scrollElement.scrollHeight,
                    behavior: 'auto'  // 立即滚动，不使用动画
                });
            } catch (e) {
                // 如果失败，回退到 scrollTop
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
        
        // 方法3: 使用 scrollIntoView（滚动最后一个子元素到视口底部）
        if (conversationMessages && conversationMessages.lastElementChild) {
            const lastChild = conversationMessages.lastElementChild;
            if (lastChild.scrollIntoView) {
                try {
                    // 将最后一个消息滚动到容器底部可见
                    lastChild.scrollIntoView({
                        behavior: 'auto',
                        block: 'end',  // 对齐到底部
                        inline: 'nearest'
                    });
                } catch (e) {
                    // 忽略错误
                }
            }
        }
    };
    
    // 立即执行滚动
    forceScroll();
    
    // 使用 requestAnimationFrame 确保在 DOM 更新后滚动
    requestAnimationFrame(() => {
        forceScroll();
        // 多次延迟滚动，确保所有异步内容都已加载（包括图片、按钮等）
        setTimeout(forceScroll, 10);
        setTimeout(forceScroll, 50);
        setTimeout(forceScroll, 100);
        setTimeout(forceScroll, 200);
        setTimeout(forceScroll, 300);
    });
}

// 平滑滚动到底部（可选，用于某些场景）
function scrollToBottomSmooth() {
    if (!conversationMessages) return;
    
    conversationMessages.scrollTo({
        top: conversationMessages.scrollHeight,
        behavior: 'smooth'
    });
}

// 切换翻译显示/隐藏
function toggleTranslation(messageId) {
    const translationDiv = document.getElementById(`translation-${messageId}`);
    const toggleBtn = document.getElementById(`translationBtn-${messageId}`);
    
    if (translationDiv && toggleBtn) {
        const isVisible = translationDiv.style.display !== 'none';
        translationDiv.style.display = isVisible ? 'none' : 'block';
        toggleBtn.classList.toggle('active', !isVisible);
        
        // 如果显示翻译，确保滚动到底部（翻译展开后内容变高）
        if (!isVisible) {
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 150);
        }
    } else {
        console.warn('未找到翻译元素:', messageId);
    }
}

// 通过URL播放音频
function playMessageAudioByUrl(audioUrl) {
    if (!audioUrl) return;
    
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
        console.error('播放音频错误:', error);
        // 不显示错误提示，静默失败
    });
}

// 播放消息音频
function playMessageAudio(messageId) {
    const audioUrl = messageAudios.get(messageId);
    if (!audioUrl) {
        console.warn('未找到音频URL:', messageId);
        return;
    }
    
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
        console.error('播放音频错误:', error);
        alert('播放音频失败');
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 生成AI语音
async function generateAIVoice(text) {
    try {
        const ttsStartTime = performance.now();
        const response = await fetch('/api/english/word/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice: currentVoice || 'en-US-JennyNeural',
                speed: 1.0
            })
        });
        
        if (!response.ok) {
            throw new Error('生成语音失败');
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAIVoice = audioUrl;
        currentAIMessage = text;
        
        const ttsTime = performance.now() - ttsStartTime;
        console.log(`[性能] TTS生成耗时: ${(ttsTime / 1000).toFixed(2)}秒`);
        
        return audioUrl; // 返回音频URL供消息使用
        
    } catch (error) {
        console.error('生成AI语音错误:', error);
        return null;
    }
}

// 播放AI语音
function playAIVoice() {
    if (!currentAIVoice) {
        alert('暂无AI语音可播放');
        return;
    }
    
    const audio = new Audio(currentAIVoice);
    audio.play().catch(error => {
        console.error('播放音频错误:', error);
        alert('播放音频失败');
    });
}

// 切换录音状态
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// 检查可用的音频输入设备
async function checkAudioDevices() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return null;
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        console.log('可用的音频输入设备:', audioInputs);
        return audioInputs;
    } catch (error) {
        console.warn('无法枚举音频设备:', error);
        return null;
    }
}

// 开始录音
async function startRecording() {
    // 检查是否在安全上下文中
    const isSecureContext = window.isSecureContext || 
                           location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1' ||
                           location.hostname === '[::1]';
    
    if (!isSecureContext) {
        alert('麦克风功能需要在安全环境下使用。\n\n请使用以下方式之一：\n1. 使用 https:// 协议访问\n2. 使用 localhost 或 127.0.0.1 访问\n\n或者使用页面下方的文本输入框继续练习。');
        enableTextInput();
        return;
    }
    
    // 检查可用的音频设备（可选，用于调试）
    const audioDevices = await checkAudioDevices();
    if (audioDevices && audioDevices.length === 0) {
        console.warn('未检测到音频输入设备');
    }
    
    try {
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            // 尝试使用旧版 API
            const getUserMedia = navigator.getUserMedia || 
                                navigator.webkitGetUserMedia || 
                                navigator.mozGetUserMedia || 
                                navigator.msGetUserMedia;
            
            if (!getUserMedia) {
                alert('您的浏览器不支持录音功能，请使用现代浏览器（Chrome、Firefox、Edge等），或使用文本输入方式继续练习。');
                enableTextInput();
                return;
            }
            
            // 使用旧版 API
            getUserMedia.call(navigator, { audio: true }, 
                (stream) => {
                    setupMediaRecorder(stream);
                },
                (error) => {
                    console.error('获取麦克风权限失败:', error);
                    let errorMsg = '无法访问麦克风';
                    if (error.name === 'PermissionDenied') {
                        errorMsg = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。';
                    } else if (error.name === 'DevicesNotFound') {
                        errorMsg = '未找到麦克风设备。\n\n注意：应用使用的是您电脑上的麦克风，不是服务器的麦克风。\n\n如果确实没有麦克风，可以使用文本输入方式继续练习。';
                    }
                    alert(`${errorMsg}\n\n或者使用文本输入方式继续练习。`);
                    enableTextInput();
                }
            );
            return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setupMediaRecorder(stream);
        
    } catch (error) {
        console.error('开始录音错误:', error);
        let errorMessage = '无法访问麦克风';
        let errorDetail = '';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = '麦克风权限被拒绝';
            errorDetail = '请在浏览器地址栏左侧点击锁图标或信息图标，然后允许麦克风访问权限。\n\n或者使用页面下方的文本输入框继续练习。';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = '未找到麦克风设备';
            errorDetail = '请检查您的电脑（客户端）是否连接了麦克风设备。\n\n注意：应用使用的是您电脑上的麦克风，不是服务器的麦克风。\n\n如果确实没有麦克风，可以使用页面下方的文本输入框继续练习。';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = '麦克风被占用';
            errorDetail = '麦克风可能被其他应用占用，请关闭其他使用麦克风的应用（如视频会议、语音聊天等），然后重试。\n\n或者使用文本输入方式继续练习。';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = '麦克风配置错误';
            errorDetail = '无法满足音频输入要求，请检查麦克风设置。\n\n或者使用文本输入方式继续练习。';
        } else {
            errorDetail = '请检查浏览器权限设置，确保允许访问麦克风。\n\n如果问题持续，可以使用页面下方的文本输入框继续练习。';
        }
        
        alert(`${errorMessage}\n\n${errorDetail}`);
        enableTextInput();
    }
}

// 设置 MediaRecorder
function setupMediaRecorder(stream) {
    try {
        // 尝试使用不同的 MIME 类型
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = ''; // 使用浏览器默认格式
                }
            }
        }
        
        const options = mimeType ? { mimeType: mimeType } : {};
        mediaRecorder = new MediaRecorder(stream, options);
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            await recognizeSpeech(audioBlob, audioUrl);
            
            // 停止所有音频轨道
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder错误:', event.error);
            stopRecording();
            alert('录音过程中发生错误，请重试');
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        updateUnifiedButtonState();
        recordingStatus.style.display = 'flex';
        
    } catch (error) {
        console.error('设置MediaRecorder失败:', error);
        stream.getTracks().forEach(track => track.stop());
        alert('初始化录音功能失败: ' + error.message);
    }
}

// 停止录音
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    isRecording = false;
    updateUnifiedButtonState();
    recordingStatus.style.display = 'none';
}

// 识别语音
async function recognizeSpeech(audioBlob, audioUrl) {
    try {
        // 尝试将webm转换为wav格式（FunASR通常需要wav格式）
        // 如果转换失败，使用原始格式
        let audioBlobToSend = audioBlob;
        let filename = 'recording.webm';
        
        try {
            const wavBlob = await convertToWav(audioBlob);
            // 检查转换是否成功（通过比较大小或类型）
            if (wavBlob !== audioBlob && wavBlob.size > 0) {
                audioBlobToSend = wavBlob;
                filename = 'recording.wav';
            }
        } catch (convertError) {
            console.warn('音频格式转换失败，使用原始格式:', convertError);
        }
        
        const formData = new FormData();
        formData.append('audio', audioBlobToSend, filename);
        formData.append('language', 'en');
        
        showLoadingMessage();
        
        const response = await fetch('/api/english/speaking/recognize', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '语音识别失败');
        }
        
        const result = await response.json();
        const recognizedText = result.text;
        
        removeLoadingMessage();
        
        if (recognizedText && recognizedText.trim()) {
            // 显示用户消息（带音频播放按钮）
            addMessage('user', recognizedText, audioUrl);
            
            // 添加到对话历史
            conversationHistory.push({
                role: 'user',
                content: recognizedText
            });
            
            // 确保滚动到底部（多次滚动确保可靠）
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 150);
            
            // 生成AI回复
            await generateConversation();
        } else {
            alert('未能识别到语音，请重试');
        }
        
    } catch (error) {
        console.error('语音识别错误:', error);
        removeLoadingMessage();
        alert('语音识别失败: ' + error.message);
    }
}

// 将webm转换为wav
async function convertToWav(webmBlob) {
    try {
        // 检查浏览器是否支持Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.warn('浏览器不支持Web Audio API，使用原始格式');
            return webmBlob;
        }
        
        // 使用AudioContext进行转换
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 注意：decodeAudioData可能不支持webm格式，取决于浏览器
        // 如果失败，尝试使用原始格式
        let audioBuffer;
        try {
            const arrayBuffer = await webmBlob.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (decodeError) {
            console.warn('音频解码失败，可能是格式不支持:', decodeError);
            // 如果解码失败，返回原始blob（某些ASR服务可能支持webm）
            return webmBlob;
        }
        
        // 将AudioBuffer转换为WAV格式
        const wavBuffer = audioBufferToWav(audioBuffer);
        return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
        console.warn('音频格式转换失败，使用原始格式:', error);
        // 如果转换失败，返回原始blob（某些ASR服务可能支持webm）
        return webmBlob;
    }
}

// AudioBuffer转WAV格式
function audioBufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV文件头
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    
    return arrayBuffer;
}

// 发送文本消息（从对话框输入）
async function sendTextMessage() {
    if (!userTextInput) return;
    
    const userText = userTextInput.value.trim();
    if (!userText) {
        alert('请输入你的回答');
        return;
    }
    
    // 显示用户消息（文本输入没有音频）
    addMessage('user', userText);
    
    // 添加到对话历史
    conversationHistory.push({
        role: 'user',
        content: userText
    });
    
    // 清空输入框
    userTextInput.value = '';
    
    // 更新按钮状态
    updateUnifiedButtonState();
    
    // 确保滚动到底部（多次滚动确保可靠）
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 150);
    
    // 生成AI回复
    await generateConversation();
}

// 提交文本输入（保留兼容性，用于非安全环境下的文本输入区域）
async function submitTextInput() {
    await sendTextMessage();
}

// 清空对话
function clearConversation() {
    if (confirm('确定要清空当前对话吗？')) {
        conversationHistory = [];
        conversationMessages.innerHTML = '';
        currentAIVoice = null;
        currentAIMessage = null;
        
        // 清理所有音频URL
        messageAudios.forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        messageAudios.clear();
        
        // 清空文本输入
        const textInput = document.getElementById('userTextInput');
        if (textInput) {
            textInput.value = '';
        }
    }
}

