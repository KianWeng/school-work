// 数学口算练习页面JavaScript

let problems = [];
let currentProblemIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let isAnswered = false;
let startTime = null;
let timerInterval = null;

// DOM元素
const operationTypeSelect = document.getElementById('operationType');
const difficultySelect = document.getElementById('difficulty');
const problemCountSelect = document.getElementById('problemCount');
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
const practiceCorrectCountEl = document.getElementById('practiceCorrectCount');
const practiceWrongCountEl = document.getElementById('practiceWrongCount');
const practiceTimeEl = document.getElementById('practiceTime');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcut);
});

// 处理键盘快捷键
function handleKeyboardShortcut(e) {
    // 只在练习进行中时响应
    if (practiceContent.style.display === 'none' || practiceResult.style.display === 'block') {
        return;
    }
    
    const answerInput = document.getElementById('answerInput');
    if (answerInput && document.activeElement !== answerInput) {
        // 如果输入框不在焦点，按数字键时聚焦输入框
        if (e.key >= '0' && e.key <= '9' || e.key === '-' || e.key === 'Backspace') {
            answerInput.focus();
        }
    }
    
    switch(e.key) {
        case 'Enter':
            if (!isAnswered && answerInput && answerInput.value.trim()) {
                e.preventDefault();
                submitAnswer();
            } else if (isAnswered) {
                e.preventDefault();
                nextQuestion();
            }
            break;
        case 'Escape':
            e.preventDefault();
            e.stopPropagation();
            skipQuestion();
            break;
    }
}

// 开始练习
async function startPractice() {
    const operationType = operationTypeSelect.value;
    const difficulty = difficultySelect.value;
    const count = parseInt(problemCountSelect.value);
    
    try {
        const response = await fetch('/api/math/calculation/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                operation_type: operationType,
                difficulty: difficulty,
                count: count
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            problems = data.problems;
            
            // 重置状态
            currentProblemIndex = 0;
            correctCount = 0;
            wrongCount = 0;
            isAnswered = false;
            startTime = Date.now();
            
            // 显示练习区域
            practiceSettings.style.display = 'none';
            practiceContent.style.display = 'block';
            practiceResult.style.display = 'none';
            
            // 初始化统计信息
            updatePracticeStats();
            updateTimer();
            
            // 启动计时器
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            timerInterval = setInterval(updateTimer, 1000);
            
            // 显示第一题
            showQuestion();
        } else {
            alert('生成题目失败，请稍后重试');
        }
    } catch (error) {
        console.error('生成题目失败:', error);
        alert('生成题目失败，请稍后重试');
    }
}

// 显示题目
function showQuestion() {
    if (currentProblemIndex >= problems.length) {
        showResult();
        return;
    }
    
    const problem = problems[currentProblemIndex];
    isAnswered = false;
    
    // 隐藏反馈
    feedbackArea.style.display = 'none';
    
    // 更新进度
    const progress = ((currentProblemIndex + 1) / problems.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${currentProblemIndex + 1} / ${problems.length}`;
    
    // 更新统计信息
    updatePracticeStats();
    
    // 显示题目
    questionArea.innerHTML = `
        <div class="question-display">
            <div class="question-text" id="questionText">${problem.question}</div>
        </div>
    `;
    
    // 显示答案输入框
    answerArea.innerHTML = `
        <input type="number" 
               id="answerInput" 
               class="answer-input" 
               placeholder="请输入答案" 
               autocomplete="off"
               autofocus>
    `;
    
    const answerInput = document.getElementById('answerInput');
    answerInput.addEventListener('input', (e) => {
        submitBtn.disabled = !e.target.value.trim();
    });
    
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (answerInput.value.trim() && !isAnswered) {
                submitAnswer();
            } else if (isAnswered) {
                nextQuestion();
            }
        }
    });
    
    // 聚焦输入框
    setTimeout(() => answerInput.focus(), 100);
    
    // 更新按钮状态
    submitBtn.disabled = true;
    submitBtn.textContent = '提交答案 (Enter)';
}

// 提交答案
async function submitAnswer() {
    if (isAnswered) {
        nextQuestion();
        return;
    }
    
    const answerInput = document.getElementById('answerInput');
    const userAnswer = answerInput.value.trim();
    
    if (!userAnswer) {
        return;
    }
    
    const problem = problems[currentProblemIndex];
    
    try {
        const response = await fetch('/api/math/calculation/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                problem_id: problem.id,
                answer: userAnswer,
                correct_answer: problem.answer
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            isAnswered = true;
            
            if (data.is_correct) {
                correctCount++;
                showFeedback(true, problem.answer);
                answerInput.classList.add('correct');
                answerInput.classList.remove('wrong');
            } else {
                wrongCount++;
                showFeedback(false, problem.answer, userAnswer);
                answerInput.classList.add('wrong');
                answerInput.classList.remove('correct');
            }
            
            updatePracticeStats();
            submitBtn.textContent = '下一题 (Enter)';
            submitBtn.disabled = false;
            
            // 禁用输入框
            answerInput.disabled = true;
        } else {
            alert('检查答案失败，请稍后重试');
        }
    } catch (error) {
        console.error('检查答案失败:', error);
        alert('检查答案失败，请稍后重试');
    }
}

// 显示反馈
function showFeedback(isCorrect, correctAnswer, userAnswer = null) {
    feedbackArea.style.display = 'block';
    feedbackArea.className = `feedback-area ${isCorrect ? 'correct' : 'wrong'}`;
    
    if (isCorrect) {
        feedbackArea.innerHTML = `
            <div class="feedback-message">✓ 回答正确！</div>
            <div class="feedback-detail">正确答案：${correctAnswer}</div>
        `;
    } else {
        feedbackArea.innerHTML = `
            <div class="feedback-message">✗ 回答错误</div>
            <div class="feedback-detail">你的答案：${userAnswer}</div>
            <div class="feedback-detail">正确答案：${correctAnswer}</div>
        `;
    }
}

// 跳过题目
function skipQuestion() {
    if (isAnswered) {
        nextQuestion();
    } else {
        // 标记为错误
        wrongCount++;
        const problem = problems[currentProblemIndex];
        showFeedback(false, problem.answer, '未作答');
        updatePracticeStats();
        
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.disabled = true;
        }
        
        isAnswered = true;
        submitBtn.textContent = '下一题 (Enter)';
        submitBtn.disabled = false;
    }
}

// 下一题
function nextQuestion() {
    currentProblemIndex++;
    showQuestion();
}

// 更新统计信息
function updatePracticeStats() {
    practiceCorrectCountEl.textContent = correctCount;
    practiceWrongCountEl.textContent = wrongCount;
}

// 更新计时器
function updateTimer() {
    if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        if (practiceTimeEl) {
            if (minutes > 0) {
                practiceTimeEl.textContent = `${minutes}分${seconds}秒`;
            } else {
                practiceTimeEl.textContent = `${seconds}秒`;
            }
        }
    }
}

// 显示结果
function showResult() {
    // 停止计时器
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    practiceContent.style.display = 'none';
    practiceResult.style.display = 'block';
    
    const total = problems.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    
    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('wrongCount').textContent = wrongCount;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    document.getElementById('totalTime').textContent = timeText;
}

// 重新开始练习
function restartPractice() {
    startPractice();
}

// 返回设置
function backToSettings() {
    practiceResult.style.display = 'none';
    practiceSettings.style.display = 'flex';
    practiceContent.style.display = 'none';
    
    // 停止计时器
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

