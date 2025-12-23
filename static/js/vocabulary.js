// 单词学习页面JavaScript
let currentTextbook = null;
let allWords = [];
let currentLetter = 'ALL';
let stats = {
    total: 0,
    new: 0,
    learning: 0,
    mastered: 0,
    review: 0
};

// DOM 元素
const textbooksGrid = document.getElementById('textbooksGrid');
const vocabularyContent = document.getElementById('vocabularyContent');
const letterNav = document.getElementById('letterNav');
const wordsList = document.getElementById('wordsList');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTextbooks();
});

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
            renderWords();
        });
        letterNav.appendChild(btn);
    });
}

// 渲染单词列表
function renderWords() {
    let filteredWords = allWords;
    
    // 按字母过滤
    if (currentLetter !== 'ALL') {
        filteredWords = allWords.filter(word => word.letter === currentLetter);
    }
    
    wordsList.innerHTML = '';
    
    if (filteredWords.length === 0) {
        wordsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">暂无单词</p>';
        return;
    }
    
    filteredWords.forEach(word => {
        const card = createWordCard(word);
        wordsList.appendChild(card);
    });
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
    
    card.innerHTML = `
        <div class="word-header">
            <div class="word-title">
                <div class="word-text">${word.word}</div>
                <div class="word-phonetic">${word.phonetic || ''}</div>
            </div>
            <span class="word-status status-${status}">${statusText[status] || '新词'}</span>
        </div>
        <div class="word-info">
            ${word.part_of_speech ? `<span class="word-pos">${word.part_of_speech}</span>` : ''}
            <div class="word-chinese">${word.chinese || ''}</div>
            ${word.example ? `<div class="word-example">${word.example}</div>` : ''}
        </div>
        <div class="word-actions">
            ${status !== 'learning' ? `<button class="action-btn learning" onclick="updateWordStatus('${word.word}', 'learning')">标记为学习中</button>` : ''}
            ${status !== 'mastered' ? `<button class="action-btn mastered" onclick="updateWordStatus('${word.word}', 'mastered')">标记为已掌握</button>` : ''}
            ${status !== 'review' ? `<button class="action-btn review" onclick="updateWordStatus('${word.word}', 'review')">标记为需复习</button>` : ''}
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

// 全局函数，供HTML调用
window.updateWordStatus = updateWordStatus;
window.backToTextbooks = backToTextbooks;

