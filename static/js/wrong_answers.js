// 错题库页面JavaScript

let allWrongAnswers = [];
let filteredWrongAnswers = [];
let currentWrongAnswerIndex = 0;

// DOM元素
const textbookFilter = document.getElementById('textbookFilter');
const modeFilter = document.getElementById('modeFilter');
const wrongAnswersList = document.getElementById('wrongAnswersList');
const emptyState = document.getElementById('emptyState');
const totalCountEl = document.getElementById('totalCount');
const totalErrorsEl = document.getElementById('totalErrors');
const wrongAnswerNav = document.getElementById('wrongAnswerNav');
const wrongAnswerControls = document.getElementById('wrongAnswerControls');
const currentIndexEl = document.getElementById('currentIndex');
const totalCountNavEl = document.getElementById('totalCount');
const prevNavBtn = document.getElementById('prevNavBtn');
const nextNavBtn = document.getElementById('nextNavBtn');

// 滑动相关变量
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadTextbooks();
    loadWrongAnswers();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', handleWrongAnswerKeyboard);
    
    // 添加触摸滑动支持（在容器上）
    const container = document.getElementById('wrongAnswerCardContainer');
    if (container) {
        setupSwipeListeners(container);
    }
});

// 处理键盘快捷键
function handleWrongAnswerKeyboard(e) {
    if (emptyState && emptyState.style.display === 'block') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            showPreviousWrongAnswer();
            break;
        case 'ArrowRight':
            e.preventDefault();
            showNextWrongAnswer();
            break;
    }
}

// 设置滑动监听器
function setupSwipeListeners(element) {
    element.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    element.addEventListener('touchmove', (e) => {
        // 允许默认滚动行为，但阻止垂直滚动时的水平滑动
        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const diffX = Math.abs(currentX - touchStartX);
        const diffY = Math.abs(currentY - touchStartY);
        
        // 如果主要是水平滑动，阻止默认行为
        if (diffX > diffY && diffX > 10) {
            e.preventDefault();
        }
    }, { passive: false });
    
    element.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
    
    // 鼠标拖动支持（桌面端）
    let isDragging = false;
    let mouseStartX = 0;
    
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        mouseStartX = e.clientX;
        element.style.cursor = 'grabbing';
    });
    
    element.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
        }
    });
    
    element.addEventListener('mouseup', (e) => {
        if (isDragging) {
            const mouseEndX = e.clientX;
            const diff = mouseStartX - mouseEndX;
            const swipeThreshold = 50;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    showNextWrongAnswer();
                } else {
                    showPreviousWrongAnswer();
                }
            }
            
            isDragging = false;
            element.style.cursor = 'grab';
        }
    });
    
    element.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'grab';
        }
    });
    
    // 设置初始光标样式
    element.style.cursor = 'grab';
}

// 处理滑动
function handleSwipe() {
    const swipeThreshold = 50;
    const diffX = touchStartX - touchEndX;
    const diffY = Math.abs(touchStartY - touchEndY);
    
    // 确保主要是水平滑动（水平距离大于垂直距离）
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > diffY) {
        if (diffX > 0) {
            // 向左滑动，显示下一个
            showNextWrongAnswer();
        } else {
            // 向右滑动，显示上一个
            showPreviousWrongAnswer();
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
        if (wrongAnswerNav) wrongAnswerNav.style.display = 'none';
        if (wrongAnswerControls) wrongAnswerControls.style.display = 'none';
        return;
    }
    
    wrongAnswersList.style.display = 'flex';
    emptyState.style.display = 'none';
    if (wrongAnswerNav) wrongAnswerNav.style.display = 'block';
    if (wrongAnswerControls) wrongAnswerControls.style.display = 'flex';
    
    wrongAnswersList.innerHTML = '';
    
    // 创建所有卡片
    filteredWrongAnswers.forEach((wrongAnswer, index) => {
        const card = createWrongAnswerCard(wrongAnswer);
        wrongAnswersList.appendChild(card);
        
        // 为每个卡片也添加滑动监听
        setupSwipeListeners(card);
    });
    
    // 重置到第一张卡片
    currentWrongAnswerIndex = 0;
    showWrongAnswer(0);
}

// 显示指定索引的错题
function showWrongAnswer(index) {
    if (filteredWrongAnswers.length === 0) return;
    
    // 确保索引在有效范围内
    if (index < 0) index = 0;
    if (index >= filteredWrongAnswers.length) index = filteredWrongAnswers.length - 1;
    
    currentWrongAnswerIndex = index;
    
    // 移动卡片容器
    const translateX = -index * 100;
    wrongAnswersList.style.transform = `translateX(${translateX}%)`;
    
    // 更新导航指示
    if (currentIndexEl) currentIndexEl.textContent = index + 1;
    if (totalCountNavEl) totalCountNavEl.textContent = filteredWrongAnswers.length;
    
    // 更新按钮状态
    if (prevNavBtn) prevNavBtn.disabled = index === 0;
    if (nextNavBtn) nextNavBtn.disabled = index === filteredWrongAnswers.length - 1;
}

// 显示上一个错题
function showPreviousWrongAnswer() {
    if (currentWrongAnswerIndex > 0) {
        showWrongAnswer(currentWrongAnswerIndex - 1);
    }
}

// 显示下一个错题
function showNextWrongAnswer() {
    if (currentWrongAnswerIndex < filteredWrongAnswers.length - 1) {
        showWrongAnswer(currentWrongAnswerIndex + 1);
    }
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
            <button class="action-btn-small mastered-btn" onclick="markAsMastered(${wrongAnswer.id})">已掌握</button>
            <button class="action-btn-small practice-btn" onclick="practiceThisWord('${escapeHtml(wrongAnswer.word).replace(/'/g, "\\'")}')">练习</button>
            <button class="action-btn-small delete-btn" onclick="deleteWrongAnswer(${wrongAnswer.id})">删除</button>
        </div>
    `;
    
    return card;
}

// 标记为已掌握（删除错题）
async function markAsMastered(wrongId) {
    if (!confirm('确定已掌握这个单词了吗？将从错题库中移除。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/english/wrong-answer/${wrongId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            // 从列表中移除
            const removedIndex = filteredWrongAnswers.findIndex(wa => wa.id === wrongId);
            filteredWrongAnswers = filteredWrongAnswers.filter(wa => wa.id !== wrongId);
            allWrongAnswers = allWrongAnswers.filter(wa => wa.id !== wrongId);
            
            updateStats();
            
            // 如果删除的是当前显示的卡片，调整索引
            if (removedIndex <= currentWrongAnswerIndex && currentWrongAnswerIndex > 0) {
                currentWrongAnswerIndex--;
            }
            if (currentWrongAnswerIndex >= filteredWrongAnswers.length && filteredWrongAnswers.length > 0) {
                currentWrongAnswerIndex = filteredWrongAnswers.length - 1;
            }
            
            renderWrongAnswers();
        } else {
            alert('操作失败');
        }
    } catch (error) {
        console.error('标记已掌握异常:', error);
        alert('操作失败');
    }
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
            const removedIndex = filteredWrongAnswers.findIndex(wa => wa.id !== wrongId);
            filteredWrongAnswers = filteredWrongAnswers.filter(wa => wa.id !== wrongId);
            allWrongAnswers = allWrongAnswers.filter(wa => wa.id !== wrongId);
            
            updateStats();
            
            // 如果删除的是当前显示的卡片，调整索引
            if (removedIndex <= currentWrongAnswerIndex && currentWrongAnswerIndex > 0) {
                currentWrongAnswerIndex--;
            }
            if (currentWrongAnswerIndex >= filteredWrongAnswers.length && filteredWrongAnswers.length > 0) {
                currentWrongAnswerIndex = filteredWrongAnswers.length - 1;
            }
            
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

