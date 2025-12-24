// 单词学习页面JavaScript
let currentTextbook = null;
let allWords = [];
let filteredWords = []; // 当前过滤后的单词列表
let currentWordIndex = 0; // 当前显示的单词索引
let currentLetter = 'ALL';
let stats = {
    total: 0,
    new: 0,
    learning: 0,
    mastered: 0,
    review: 0
};
let currentVoice = 'en-US-JennyNeural'; // 默认语音
let currentAudio = null; // 当前播放的音频对象

// 触摸滑动相关
let touchStartX = 0;
let touchEndX = 0;
let isDragging = false;

// DOM 元素
const textbooksGrid = document.getElementById('textbooksGrid');
const vocabularyContent = document.getElementById('vocabularyContent');
const letterNav = document.getElementById('letterNav');
const wordCardWrapper = document.getElementById('wordCardWrapper');
const currentWordIndexEl = document.getElementById('currentWordIndex');
const totalWordCountEl = document.getElementById('totalWordCount');
const prevWordBtn = document.getElementById('prevWordBtn');
const nextWordBtn = document.getElementById('nextWordBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTextbooks();
    setupSwipeHandlers();
});

// 设置滑动处理
function setupSwipeHandlers() {
    const container = document.getElementById('wordCardContainer');
    if (!container) return;
    
    // 触摸事件
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        isDragging = false;
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
        isDragging = true;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    }, { passive: true });
    
    // 鼠标事件（用于桌面端拖拽）
    let mouseStartX = 0;
    let mouseIsDown = false;
    
    container.addEventListener('mousedown', (e) => {
        mouseStartX = e.clientX;
        mouseIsDown = true;
        container.style.cursor = 'grabbing';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!mouseIsDown) return;
        isDragging = true;
    });
    
    container.addEventListener('mouseup', (e) => {
        if (mouseIsDown && isDragging) {
            const mouseEndX = e.clientX;
            const diff = mouseStartX - mouseEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    showNextWord();
                } else {
                    showPreviousWord();
                }
            }
        }
        mouseIsDown = false;
        isDragging = false;
        container.style.cursor = 'default';
    });
    
    container.addEventListener('mouseleave', () => {
        mouseIsDown = false;
        isDragging = false;
        container.style.cursor = 'default';
    });
}

// 处理滑动
function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
        if (diff > 0) {
            // 向左滑动，显示下一个
            showNextWord();
        } else {
            // 向右滑动，显示上一个
            showPreviousWord();
        }
    }
}

// 加载教材列表
async function loadTextbooks() {
    try {
        const response = await fetch('/api/english/textbooks', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const textbooks = await response.json();
            renderTextbooks(textbooks);
        } else {
            alert('加载教材列表失败');
        }
    } catch (error) {
        console.error('加载教材失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染教材卡片
function renderTextbooks(textbooks) {
    textbooksGrid.innerHTML = '';
    textbooks.forEach(textbook => {
        const card = document.createElement('div');
        card.className = 'textbook-card';
        card.innerHTML = `
            <div class="icon">${textbook.icon}</div>
            <div class="name">${textbook.name}</div>
            <div class="description">${textbook.description}</div>
        `;
        card.addEventListener('click', () => {
            selectTextbook(textbook.id);
        });
        textbooksGrid.appendChild(card);
    });
}

// 选择教材
async function selectTextbook(textbookId) {
    currentTextbook = textbookId;
    
    // 隐藏教材选择区域
    const textbookSelector = document.querySelector('.textbook-selector');
    if (textbookSelector) {
        textbookSelector.style.display = 'none';
    }
    
    // 显示单词学习内容
    vocabularyContent.style.display = 'block';
    
    // 显示返回教材选择按钮
    const backToTextbooksBtn = document.getElementById('backToTextbooks');
    if (backToTextbooksBtn) {
        backToTextbooksBtn.style.display = 'inline-block';
    }
    
    // 更新页面标题显示当前教材
    const header = document.querySelector('.header h1');
    if (header) {
        // 获取教材名称
        const textbooks = await fetch('/api/english/textbooks', {
            credentials: 'same-origin'
        }).then(r => r.json());
        const textbook = textbooks.find(t => t.id === textbookId);
        if (textbook) {
            header.textContent = `📖 ${textbook.name} - 单词学习`;
        }
    }
    
    await loadWords(textbookId);
    await loadStats(textbookId);
    await loadVoices(); // 确保语音列表已加载
    renderLetterNav();
}

// 加载单词
async function loadWords(textbookId) {
    try {
        const response = await fetch(`/api/english/textbook/${textbookId}/words`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            allWords = data.words;
            renderWords();
        } else {
            alert('加载单词失败');
        }
    } catch (error) {
        console.error('加载单词失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 加载统计信息
async function loadStats(textbookId) {
    try {
        const response = await fetch(`/api/english/word/stats?textbook=${textbookId}`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            stats = await response.json();
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 更新统计显示
function updateStatsDisplay() {
    document.getElementById('statTotal').textContent = stats.total || 0;
    document.getElementById('statNew').textContent = stats.new || 0;
    document.getElementById('statLearning').textContent = stats.learning || 0;
    document.getElementById('statMastered').textContent = stats.mastered || 0;
    document.getElementById('statReview').textContent = stats.review || 0;
}

// 渲染字母导航
function renderLetterNav() {
    // 获取所有字母
    const letters = new Set();
    allWords.forEach(word => {
        if (word.letter) {
            letters.add(word.letter);
        }
    });
    
    const sortedLetters = ['ALL', ...Array.from(letters).sort()];
    
    letterNav.innerHTML = '';
    sortedLetters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        if (letter === currentLetter) {
            btn.classList.add('active');
        }
        btn.textContent = letter;
        btn.addEventListener('click', () => {
            currentLetter = letter;
            renderLetterNav();
            renderWords(); // 这会重置索引并显示第一个单词
        });
        letterNav.appendChild(btn);
    });
}

// 渲染单词列表
function renderWords() {
    // 按字母过滤
    if (currentLetter !== 'ALL') {
        filteredWords = allWords.filter(word => word.letter === currentLetter);
    } else {
        filteredWords = allWords;
    }
    
    // 重置索引
    currentWordIndex = 0;
    
    // 更新计数器
    updateWordCounter();
    
    // 显示当前单词
    showCurrentWord();
    
    // 更新导航按钮状态
    updateNavButtons();
}

// 显示当前单词
function showCurrentWord() {
    if (filteredWords.length === 0) {
        wordCardWrapper.innerHTML = '<div class="word-card"><p style="text-align: center; color: #666; padding: 40px;">暂无单词</p></div>';
        return;
    }
    
    const word = filteredWords[currentWordIndex];
    const card = createWordCard(word);
    wordCardWrapper.innerHTML = '';
    wordCardWrapper.appendChild(card);
}

// 显示上一个单词
function showPreviousWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
        showCurrentWord();
        updateWordCounter();
        updateNavButtons();
    }
}

// 显示下一个单词
function showNextWord() {
    if (currentWordIndex < filteredWords.length - 1) {
        currentWordIndex++;
        showCurrentWord();
        updateWordCounter();
        updateNavButtons();
    }
}

// 更新单词计数器
function updateWordCounter() {
    if (currentWordIndexEl) {
        currentWordIndexEl.textContent = filteredWords.length > 0 ? currentWordIndex + 1 : 0;
    }
    if (totalWordCountEl) {
        totalWordCountEl.textContent = filteredWords.length;
    }
}

// 更新导航按钮状态
function updateNavButtons() {
    if (prevWordBtn) {
        prevWordBtn.disabled = currentWordIndex === 0;
    }
    if (nextWordBtn) {
        nextWordBtn.disabled = currentWordIndex >= filteredWords.length - 1;
    }
}

// 创建单词卡片
function createWordCard(word) {
    const card = document.createElement('div');
    const status = word.progress?.status || 'new';
    card.className = `word-card status-${status}`;
    
    const statusText = {
        'new': '新词',
        'learning': '学习中',
        'mastered': '已掌握',
        'review': '需复习'
    };
    
    // 转义HTML特殊字符，防止XSS
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    const wordEscaped = escapeHtml(word.word);
    const phoneticEscaped = escapeHtml(word.phonetic || '');
    const chineseEscaped = escapeHtml(word.chinese || '');
    
    // 处理例句：按 / 分割，每个句子单独显示
    let exampleHtml = '';
    if (word.example) {
        const examples = word.example.split('/').map(e => e.trim()).filter(e => e);
        if (examples.length > 0) {
            exampleHtml = '<div class="word-examples">';
            examples.forEach((example, index) => {
                const exampleEscaped = escapeHtml(example);
                // 转义单引号用于onclick
                const exampleForJs = example.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                exampleHtml += `
                    <div class="word-example-item">
                        <span class="example-text">${exampleEscaped}</span>
                        <button class="speech-btn speech-btn-small" onclick="playExampleSpeech('${exampleForJs}')" title="朗读例句">
                            🔊
                        </button>
                    </div>
                `;
            });
            exampleHtml += '</div>';
        }
    }
    
    card.innerHTML = `
        <div class="word-header">
            <div class="word-title">
                <div class="word-text-container">
                    <span class="word-text">${wordEscaped}</span>
                    <button class="speech-btn" onclick="playWordSpeech('${wordEscaped.replace(/'/g, "\\'")}')" title="朗读单词">
                        🔊
                    </button>
                </div>
                <div class="word-phonetic">${phoneticEscaped}</div>
            </div>
            <span class="word-status status-${status}">${statusText[status] || '新词'}</span>
        </div>
        <div class="word-info">
            ${word.part_of_speech ? `<span class="word-pos">${word.part_of_speech}</span>` : ''}
            <div class="word-chinese">${chineseEscaped}</div>
            ${exampleHtml}
        </div>
        <div class="word-actions">
            ${status !== 'learning' ? `<button class="action-btn learning" onclick="updateWordStatus('${wordEscaped.replace(/'/g, "\\'")}', 'learning')">标记为学习中</button>` : ''}
            ${status !== 'mastered' ? `<button class="action-btn mastered" onclick="updateWordStatus('${wordEscaped.replace(/'/g, "\\'")}', 'mastered')">标记为已掌握</button>` : ''}
            ${status !== 'review' ? `<button class="action-btn review" onclick="updateWordStatus('${wordEscaped.replace(/'/g, "\\'")}', 'review')">标记为需复习</button>` : ''}
        </div>
    `;
    
    return card;
}

// 更新单词状态
async function updateWordStatus(word, status) {
    try {
        const response = await fetch('/api/english/word/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                word: word,
                textbook: currentTextbook,
                status: status
            })
        });
        
        if (response.ok) {
            // 重新加载单词和统计
            await loadWords(currentTextbook);
            await loadStats(currentTextbook);
            renderWords();
        } else {
            alert('更新失败，请重试');
        }
    } catch (error) {
        console.error('更新单词状态失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 返回教材选择
function backToTextbooks() {
    currentTextbook = null;
    currentLetter = 'ALL';
    allWords = [];
    
    // 显示教材选择区域
    const textbookSelector = document.querySelector('.textbook-selector');
    if (textbookSelector) {
        textbookSelector.style.display = 'block';
    }
    
    // 隐藏单词学习内容
    vocabularyContent.style.display = 'none';
    
    // 恢复标题
    const header = document.querySelector('.header h1');
    if (header) {
        header.textContent = '📖 单词学习';
    }
    
    // 隐藏返回按钮
    const backToTextbooksBtn = document.getElementById('backToTextbooks');
    if (backToTextbooksBtn) {
        backToTextbooksBtn.style.display = 'none';
    }
}

// 播放单词发音
async function playWordSpeech(text) {
    await playSpeech(text);
}

// 播放例句发音
async function playExampleSpeech(text) {
    await playSpeech(text);
}

// 播放语音
async function playSpeech(text) {
    try {
        // 停止当前播放的音频
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        
        console.log('请求播放语音:', text);
        
        // 调用后端API生成语音
        const response = await fetch('/api/english/word/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                text: text,
                voice: currentVoice,
                speed: 1.0
            })
        });
        
        console.log('TTS响应状态:', response.status, response.statusText);
        
        if (response.ok) {
            // 检查响应类型
            const contentType = response.headers.get('Content-Type');
            console.log('响应Content-Type:', contentType);
            
            if (contentType && contentType.includes('audio')) {
                // 获取音频blob
                const audioBlob = await response.blob();
                console.log('音频Blob大小:', audioBlob.size, 'bytes');
                
                if (audioBlob.size === 0) {
                    alert('TTS服务返回了空音频，请检查TTS服务配置');
                    return;
                }
                
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // 创建音频对象并播放
                currentAudio = new Audio(audioUrl);
                
                currentAudio.onloadeddata = () => {
                    console.log('音频加载完成，开始播放');
                };
                
                currentAudio.onerror = (e) => {
                    console.error('音频播放失败:', e);
                    alert('音频播放失败，请检查音频格式');
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                };
                
                try {
                    await currentAudio.play();
                    console.log('音频播放成功');
                } catch (playError) {
                    console.error('播放错误:', playError);
                    alert('无法播放音频，可能是浏览器权限问题');
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                }
                
                // 播放结束后清理
                currentAudio.onended = () => {
                    console.log('音频播放结束');
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                };
            } else {
                // 响应不是音频，可能是错误信息
                const errorData = await response.json();
                console.error('TTS错误响应:', errorData);
                alert(`TTS错误: ${errorData.error || '未知错误'}\n${errorData.details || ''}`);
            }
        } else {
            // 尝试解析错误信息
            let errorMessage = `HTTP错误: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                if (errorData.details) {
                    errorMessage += `\n详情: ${errorData.details}`;
                }
                console.error('TTS API错误:', errorData);
            } catch (e) {
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
                console.error('TTS错误响应文本:', errorText);
            }
            
            // 根据错误类型显示不同的提示
            if (response.status === 500) {
                alert(`TTS服务错误:\n${errorMessage}\n\n请检查:\n1. TTS服务是否运行在 http://localhost:5050\n2. API密钥是否正确配置`);
            } else {
                alert(`播放失败: ${errorMessage}`);
            }
        }
    } catch (error) {
        console.error('播放语音失败:', error);
        alert(`网络错误: ${error.message}\n\n请检查:\n1. 网络连接是否正常\n2. TTS服务是否可访问`);
    }
}

// 加载可用语音列表
async function loadVoices() {
    try {
        const response = await fetch('/api/english/voices', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const voices = await response.json();
            const voiceSelect = document.getElementById('voiceSelect');
            if (voiceSelect) {
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
                
                // 添加选择事件监听
                voiceSelect.addEventListener('change', (e) => {
                    currentVoice = e.target.value;
                    console.log('语音已切换为:', currentVoice);
                    // 可以在这里添加提示或保存到本地存储
                    localStorage.setItem('selectedVoice', currentVoice);
                });
                
                // 从本地存储恢复之前选择的语音
                const savedVoice = localStorage.getItem('selectedVoice');
                if (savedVoice && voices.find(v => v.id === savedVoice)) {
                    currentVoice = savedVoice;
                    voiceSelect.value = savedVoice;
                }
            }
        } else {
            console.error('加载语音列表失败:', response.status);
        }
    } catch (error) {
        console.error('加载语音列表失败:', error);
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="">加载失败</option>';
        }
    }
}

// 初始化时加载语音列表
document.addEventListener('DOMContentLoaded', () => {
    loadVoices();
});

// 全局函数，供HTML调用
window.updateWordStatus = updateWordStatus;
window.backToTextbooks = backToTextbooks;
window.playWordSpeech = playWordSpeech;
window.playExampleSpeech = playExampleSpeech;
window.showPreviousWord = showPreviousWord;
window.showNextWord = showNextWord;

