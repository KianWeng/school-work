// 单词练习页面JavaScript

let currentTextbook = null;
let allWords = [];
let practiceWords = [];
let currentQuestionIndex = 0;
let practiceMode = 'chinese_to_english'; // chinese_to_english 或 english_to_chinese
let practiceCount = 20;
let letterRange = 'ALL';
let correctCount = 0;
let wrongCount = 0;
let currentAnswer = '';
let isAnswered = false;
let answerHistory = []; // 记录答题历史，用于上一题功能

// DOM元素
const textbookSelect = document.getElementById('textbookSelect');
const practiceModeSelect = document.getElementById('practiceMode');
const practiceCountSelect = document.getElementById('practiceCount');
const letterRangeSelect = document.getElementById('letterRange');
const startBtn = document.getElementById('startBtn');
const practiceContent = document.getElementById('practiceContent');
const practiceSettings = document.querySelector('.practice-settings');
const questionArea = document.getElementById('questionArea');
const answerArea = document.getElementById('answerArea');
const submitBtn = document.getElementById('submitBtn');
const skipBtn = document.getElementById('skipBtn');
const feedbackArea = document.getElementById('feedbackArea');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const practiceResult = document.getElementById('practiceResult');
const backToPracticeDiv = document.querySelector('.back-to-practice');
const practiceCorrectCountEl = document.getElementById('practiceCorrectCount');
const practiceWrongCountEl = document.getElementById('practiceWrongCount');
const practiceAccuracyEl = document.getElementById('practiceAccuracy');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTextbooks();
    loadLetters();
    
    // 监听模式切换
    practiceModeSelect.addEventListener('change', (e) => {
        practiceMode = e.target.value;
    });
    
    // 监听输入框变化
    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.addEventListener('input', (e) => {
            currentAnswer = e.target.value.trim();
            submitBtn.disabled = !currentAnswer;
        });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcut);
});

// 处理键盘快捷键
function handleKeyboardShortcut(e) {
    // 只在练习进行中时响应
    if (practiceContent.style.display === 'none' || practiceResult.style.display === 'block') {
        return;
    }
    
    switch(e.key) {
        case 'Escape':
            // ESC键跳过题目（包括在输入框中）
            e.preventDefault();
            e.stopPropagation();
            skipQuestion();
            break;
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
            textbookSelect.innerHTML = '';
            textbooks.forEach(textbook => {
                const option = document.createElement('option');
                option.value = textbook.id;
                option.textContent = textbook.name;
                textbookSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载教材列表失败:', error);
    }
}

// 加载字母列表
async function loadLetters() {
    try {
        const response = await fetch('/api/english/textbooks', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const textbooks = await response.json();
            if (textbooks.length > 0) {
                // 加载第一个教材的字母
                const textbookId = textbooks[0].id;
                const wordsResponse = await fetch(`/api/english/textbook/${textbookId}/words`, {
                    credentials: 'same-origin'
                });
                if (wordsResponse.ok) {
                    const data = await wordsResponse.json();
                    // 获取所有字母
                    const letters = [...new Set(data.words.map(w => w.letter))].sort();
                    letterRangeSelect.innerHTML = '<option value="ALL">全部字母</option>';
                    letters.forEach(letter => {
                        const option = document.createElement('option');
                        option.value = letter;
                        option.textContent = letter;
                        letterRangeSelect.appendChild(option);
                    });
                }
            }
        }
    } catch (error) {
        console.error('加载字母列表失败:', error);
    }
}

// 开始练习
async function startPractice() {
    const textbookId = textbookSelect.value;
    if (!textbookId) {
        alert('请选择教材');
        return;
    }
    
    currentTextbook = textbookId;
    practiceMode = practiceModeSelect.value;
    practiceCount = practiceCountSelect.value; // 可能是数字字符串或"all"
    letterRange = letterRangeSelect.value;
    
    // 加载单词
    try {
        const response = await fetch(`/api/english/textbook/${textbookId}/words`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            allWords = data.words;
            
            // 过滤字母范围
            if (letterRange !== 'ALL') {
                allWords = allWords.filter(w => w.letter === letterRange);
            }
            
            if (allWords.length === 0) {
                alert('没有可用的单词');
                return;
            }
            
            // 随机选择练习单词
            if (practiceCount === 'all' || practiceCount === '全部') {
                // 选择全部单词
                practiceWords = shuffleArray([...allWords]);
            } else {
                // 选择指定数量的单词
                const count = parseInt(practiceCount);
                practiceWords = shuffleArray([...allWords]).slice(0, Math.min(count, allWords.length));
            }
            
            // 重置状态
            currentQuestionIndex = 0;
            correctCount = 0;
            wrongCount = 0;
            answerHistory = [];
            
            // 显示练习区域
            practiceSettings.style.display = 'none';
            practiceContent.style.display = 'block';
            practiceResult.style.display = 'none';
            if (backToPracticeDiv) {
                backToPracticeDiv.style.display = 'none';
            }
            
            // 初始化统计信息
            updatePracticeStats();
            
            // 显示第一题
            showQuestion();
        } else {
            alert('加载单词失败');
        }
    } catch (error) {
        console.error('加载单词失败:', error);
        alert('加载单词失败');
    }
}

// 显示题目
function showQuestion() {
    if (currentQuestionIndex >= practiceWords.length) {
        showResult();
        return;
    }
    
    const word = practiceWords[currentQuestionIndex];
    
    // 检查是否有历史记录
    const history = answerHistory[currentQuestionIndex];
    if (history) {
        // 恢复历史状态
        isAnswered = history.isAnswered;
        currentAnswer = history.answer || '';
    } else {
        // 新题目
        isAnswered = false;
        currentAnswer = '';
    }
    
    feedbackArea.style.display = 'none';
    
    // 更新进度
    const progress = ((currentQuestionIndex + 1) / practiceWords.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${currentQuestionIndex + 1} / ${practiceWords.length}`;
    
    // 更新统计信息
    updatePracticeStats();
    
    // 清空答案区域
    answerArea.innerHTML = '';
    
    if (practiceMode === 'chinese_to_english') {
        // 中文→英文模式：显示音标和中文，输入英文
        questionArea.innerHTML = `
            <div class="question-title">请根据音标和中文，输入英文单词</div>
            <div class="question-phonetic">${word.phonetic || ''}</div>
            <div class="question-chinese">${word.chinese}</div>
        `;
        
        answerArea.innerHTML = `
            <input type="text" 
                   id="answerInput" 
                   class="answer-input" 
                   placeholder="请输入英文单词"
                   autocomplete="off"
                   autofocus>
        `;
        
        const answerInput = document.getElementById('answerInput');
        answerInput.addEventListener('input', (e) => {
            currentAnswer = e.target.value.trim();
            submitBtn.disabled = !currentAnswer;
        });
        
        answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (currentAnswer && !isAnswered) {
                    submitAnswer();
                } else if (isAnswered) {
                    nextQuestion();
                }
            }
        });
        
        // 在输入框中也响应ESC键
        answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                skipQuestion();
            }
        });
        
        // 聚焦输入框
        setTimeout(() => answerInput.focus(), 100);
        
    } else {
        // 英文→中文模式：显示音标和英文，选择中文
        questionArea.innerHTML = `
            <div class="question-title">请根据音标和英文，选择中文释义</div>
            <div class="question-phonetic">${word.phonetic || ''}</div>
            <div class="question-word">${word.word}</div>
        `;
        
        // 生成选项（正确答案 + 3个错误选项）
        const options = generateChineseOptions(word);
        
        answerArea.innerHTML = `
            <div class="choice-options">
                ${options.map((opt, index) => {
                    const isSelected = currentAnswer === opt;
                    const classes = isSelected ? 'choice-option selected' : 'choice-option';
                    return `
                    <div class="${classes}" 
                         data-value="${opt}" 
                         onclick="selectChineseOption(this, '${opt.replace(/'/g, "\\'")}')">
                        ${opt}
                    </div>
                `;
                }).join('')}
            </div>
        `;
        
        // 如果已答题，恢复选中状态和反馈
        if (isAnswered && history) {
            const word = practiceWords[currentQuestionIndex];
            showFeedback(history.isCorrect, word, true);
        }
    }
    
    submitBtn.disabled = practiceMode === 'chinese_to_english' && !currentAnswer;
    submitBtn.textContent = isAnswered ? '下一题 (Enter)' : '提交答案 (Enter)';
}

// 生成中文选项（正确答案 + 3个错误选项）
function generateChineseOptions(correctWord) {
    const options = [correctWord.chinese];
    
    // 从其他单词中随机选择3个错误选项
    const otherWords = allWords.filter(w => 
        w.word !== correctWord.word && 
        w.chinese !== correctWord.chinese
    );
    
    const shuffledOthers = shuffleArray([...otherWords]);
    for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
        if (!options.includes(shuffledOthers[i].chinese)) {
            options.push(shuffledOthers[i].chinese);
        }
    }
    
    // 如果选项不足4个，补充一些通用选项
    const commonOptions = ['好的', '坏的', '大的', '小的', '新的', '旧的', '快的', '慢的'];
    while (options.length < 4) {
        const randomOption = commonOptions[Math.floor(Math.random() * commonOptions.length)];
        if (!options.includes(randomOption)) {
            options.push(randomOption);
        }
    }
    
    // 打乱选项顺序
    return shuffleArray(options).slice(0, 4);
}

// 选择中文选项
function selectChineseOption(element, value) {
    if (isAnswered) return;
    
    // 移除其他选项的选中状态
    document.querySelectorAll('.choice-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // 添加选中状态
    element.classList.add('selected');
    currentAnswer = value;
    submitBtn.disabled = false;
}

// 保存当前答案到历史记录
function saveCurrentAnswer() {
    if (answerHistory[currentQuestionIndex]) {
        // 更新现有记录
        answerHistory[currentQuestionIndex].answer = currentAnswer;
        answerHistory[currentQuestionIndex].isAnswered = isAnswered;
    } else {
        // 创建新记录（未答题状态）
        answerHistory[currentQuestionIndex] = {
            answer: currentAnswer,
            isAnswered: false,
            isCorrect: false
        };
    }
}

// 提交答案
async function submitAnswer() {
    if (isAnswered) {
        nextQuestion();
        return;
    }
    
    const word = practiceWords[currentQuestionIndex];
    let isCorrect = false;
    
    if (practiceMode === 'chinese_to_english') {
        // 比较英文单词（不区分大小写，去除空格）
        const correctAnswer = word.word.toLowerCase().trim();
        const userAnswer = currentAnswer.toLowerCase().trim();
        isCorrect = correctAnswer === userAnswer;
    } else {
        // 比较中文
        isCorrect = currentAnswer === word.chinese;
    }
    
    // 如果答错，保存到错题库
    if (!isCorrect) {
        await saveWrongAnswer(word);
    }
    
    // 保存到历史记录
    answerHistory[currentQuestionIndex] = {
        answer: currentAnswer,
        isAnswered: true,
        isCorrect: isCorrect
    };
    
    // 显示反馈
    showFeedback(isCorrect, word);
    
    // 更新统计
    if (isCorrect) {
        correctCount++;
    } else {
        wrongCount++;
    }
    
    isAnswered = true;
    submitBtn.textContent = '下一题 (Enter)';
    submitBtn.disabled = false;
    
    // 更新统计信息
    updatePracticeStats();
}

// 更新练习统计信息
function updatePracticeStats() {
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    
    if (practiceCorrectCountEl) {
        practiceCorrectCountEl.textContent = correctCount;
    }
    if (practiceWrongCountEl) {
        practiceWrongCountEl.textContent = wrongCount;
    }
    if (practiceAccuracyEl) {
        practiceAccuracyEl.textContent = `${accuracy}%`;
    }
}

// 保存错题到服务器
async function saveWrongAnswer(word) {
    try {
        const response = await fetch('/api/english/wrong-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                word: word.word,
                phonetic: word.phonetic || '',
                chinese: word.chinese,
                textbook: currentTextbook,
                practice_mode: practiceMode,
                user_answer: currentAnswer,
                correct_answer: practiceMode === 'chinese_to_english' ? word.word : word.chinese
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('错题已保存:', result);
        } else {
            console.error('保存错题失败:', response.status);
        }
    } catch (error) {
        console.error('保存错题异常:', error);
    }
}

// 显示反馈
function showFeedback(isCorrect, word, isRestore = false) {
    feedbackArea.style.display = 'block';
    feedbackArea.className = `feedback-area ${isCorrect ? 'correct' : 'wrong'}`;
    
    if (practiceMode === 'chinese_to_english') {
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            if (!isRestore) {
                answerInput.classList.add(isCorrect ? 'correct' : 'wrong');
            }
            answerInput.disabled = isAnswered;
        }
        
        feedbackArea.innerHTML = `
            <div class="feedback-message">${isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}</div>
            <div class="feedback-detail">
                正确答案：<strong>${word.word}</strong><br>
                ${word.example ? `例句：${word.example.split('/')[0]}` : ''}
            </div>
        `;
    } else {
        // 标记选项
        document.querySelectorAll('.choice-option').forEach(opt => {
            if (!isRestore) {
                opt.classList.add('disabled');
            }
            if (opt.dataset.value === word.chinese) {
                opt.classList.add('correct');
            } else if (opt.classList.contains('selected') && opt.dataset.value !== word.chinese) {
                opt.classList.add('wrong');
            }
        });
        
        feedbackArea.innerHTML = `
            <div class="feedback-message">${isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}</div>
            <div class="feedback-detail">
                正确答案：<strong>${word.chinese}</strong><br>
                ${word.example ? `例句：${word.example.split('/')[0]}` : ''}
            </div>
        `;
    }
}

// 下一题
function nextQuestion() {
    if (!isAnswered) {
        // 如果还没答题，先保存当前状态（跳过状态）
        saveCurrentAnswer();
        answerHistory[currentQuestionIndex] = {
            answer: currentAnswer,
            isAnswered: false,
            isCorrect: false
        };
    }
    
    currentQuestionIndex++;
    showQuestion();
}

// 跳过题目
function skipQuestion() {
    // 保存当前状态（跳过状态）
    saveCurrentAnswer();
    answerHistory[currentQuestionIndex].isAnswered = false;
    answerHistory[currentQuestionIndex].isCorrect = false;
    
    wrongCount++;
    currentQuestionIndex++;
    showQuestion();
}

// 返回单词练习（重新开始）
function backToPractice() {
    // 如果正在练习中，需要确认
    if (practiceContent.style.display === 'block' && practiceResult.style.display === 'none') {
        if (!confirm('确定要返回练习设置吗？当前进度将不会保存。')) {
            return;
        }
    }
    
    // 显示设置界面
    practiceSettings.style.display = 'block';
    // 隐藏练习内容
    practiceContent.style.display = 'none';
    practiceResult.style.display = 'none';
    if (backToPracticeDiv) {
        backToPracticeDiv.style.display = 'none';
    }
    
    // 重置状态
    currentQuestionIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    answerHistory = [];
}

// 显示结果
function showResult() {
    practiceContent.style.display = 'none';
    practiceResult.style.display = 'block';
    if (backToPracticeDiv) {
        backToPracticeDiv.style.display = 'none'; // 隐藏单独的返回按钮区域，使用结果页面的按钮
    }
    
    const total = practiceWords.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    
    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('wrongCount').textContent = wrongCount;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
}

// 重新开始
function restartPractice() {
    practiceSettings.style.display = 'block';
    practiceContent.style.display = 'none';
    practiceResult.style.display = 'none';
}

// 工具函数：打乱数组
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

