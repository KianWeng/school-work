// 错题库页面JavaScript

let allWrongAnswers = [];
let filteredWrongAnswers = [];

// DOM元素
const textbookFilter = document.getElementById('textbookFilter');
const modeFilter = document.getElementById('modeFilter');
const wrongAnswersList = document.getElementById('wrongAnswersList');
const emptyState = document.getElementById('emptyState');
const totalCountEl = document.getElementById('totalCount');
const totalErrorsEl = document.getElementById('totalErrors');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTextbooks();
    loadWrongAnswers();
});

// 加载教材列表
async function loadTextbooks() {
    try {
        const response = await fetch('/api/english/textbooks', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const textbooks = await response.json();
            textbookFilter.innerHTML = '<option value="">全部</option>';
            textbooks.forEach(textbook => {
                const option = document.createElement('option');
                option.value = textbook.id;
                option.textContent = textbook.name;
                textbookFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载教材列表失败:', error);
    }
}

// 加载错题列表
async function loadWrongAnswers() {
    try {
        const textbook = textbookFilter.value || '';
        const mode = modeFilter.value || '';
        
        let url = '/api/english/wrong-answers?';
        if (textbook) url += `textbook=${textbook}&`;
        if (mode) url += `practice_mode=${mode}&`;
        
        const response = await fetch(url, {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            allWrongAnswers = data.wrong_answers || [];
            filteredWrongAnswers = allWrongAnswers;
            
            updateStats();
            renderWrongAnswers();
        } else {
            console.error('加载错题列表失败:', response.status);
            showError('加载错题列表失败');
        }
    } catch (error) {
        console.error('加载错题列表异常:', error);
        showError('加载错题列表异常');
    }
}

// 更新统计信息
function updateStats() {
    const total = filteredWrongAnswers.length;
    const totalErrors = filteredWrongAnswers.reduce((sum, item) => sum + item.error_count, 0);
    
    totalCountEl.textContent = total;
    totalErrorsEl.textContent = totalErrors;
}

// 渲染错题列表
function renderWrongAnswers() {
    if (filteredWrongAnswers.length === 0) {
        wrongAnswersList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    wrongAnswersList.style.display = 'grid';
    emptyState.style.display = 'none';
    
    wrongAnswersList.innerHTML = '';
    
    filteredWrongAnswers.forEach(wrongAnswer => {
        const card = createWrongAnswerCard(wrongAnswer);
        wrongAnswersList.appendChild(card);
    });
}

// 创建错题卡片
function createWrongAnswerCard(wrongAnswer) {
    const card = document.createElement('div');
    card.className = 'wrong-answer-card';
    
    const modeText = wrongAnswer.practice_mode === 'chinese_to_english' 
        ? '中文→英文' 
        : '英文→中文';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="word-info">
                <div class="word-text">${escapeHtml(wrongAnswer.word)}</div>
                ${wrongAnswer.phonetic ? `<div class="word-phonetic">${escapeHtml(wrongAnswer.phonetic)}</div>` : ''}
                <div class="word-chinese">${escapeHtml(wrongAnswer.chinese)}</div>
            </div>
            <div class="error-badge">错误 ${wrongAnswer.error_count} 次</div>
        </div>
        <div class="card-content">
            <div class="answer-section">
                <div class="answer-label">您的答案：</div>
                <div class="answer-text user-answer">${escapeHtml(wrongAnswer.user_answer || '未填写')}</div>
            </div>
            <div class="answer-section">
                <div class="answer-label">正确答案：</div>
                <div class="answer-text correct-answer">${escapeHtml(wrongAnswer.correct_answer)}</div>
            </div>
            <div class="practice-mode">练习模式：${modeText}</div>
        </div>
        <div class="card-actions">
            <button class="action-btn-small delete-btn" onclick="deleteWrongAnswer(${wrongAnswer.id})">删除</button>
            <button class="action-btn-small practice-btn" onclick="practiceThisWord('${escapeHtml(wrongAnswer.word).replace(/'/g, "\\'")}')">练习</button>
        </div>
    `;
    
    return card;
}

// 删除错题
async function deleteWrongAnswer(wrongId) {
    if (!confirm('确定要删除这条错题吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/english/wrong-answer/${wrongId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            // 从列表中移除
            filteredWrongAnswers = filteredWrongAnswers.filter(wa => wa.id !== wrongId);
            allWrongAnswers = allWrongAnswers.filter(wa => wa.id !== wrongId);
            
            updateStats();
            renderWrongAnswers();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除错题异常:', error);
        alert('删除失败');
    }
}

// 练习这个单词
function practiceThisWord(word) {
    // 跳转到练习页面，并传递单词参数
    window.location.href = `/english/practice?word=${encodeURIComponent(word)}`;
}

// 清空错题库
async function clearAllWrongAnswers() {
    if (!confirm('确定要清空所有错题吗？此操作不可恢复！')) {
        return;
    }
    
    try {
        // 逐个删除所有错题
        const deletePromises = allWrongAnswers.map(wa => 
            fetch(`/api/english/wrong-answer/${wa.id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            })
        );
        
        await Promise.all(deletePromises);
        
        // 清空列表
        allWrongAnswers = [];
        filteredWrongAnswers = [];
        
        updateStats();
        renderWrongAnswers();
        
        alert('错题库已清空');
    } catch (error) {
        console.error('清空错题库异常:', error);
        alert('清空失败');
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示错误信息
function showError(message) {
    alert(message);
}

