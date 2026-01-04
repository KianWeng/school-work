// 阅读理解页面JavaScript

let currentGrade = null;
let currentArticle = null;
let currentQuestions = [];
let currentAnswers = [];
let userAnswers = {};

// DOM元素
const gradeSelector = document.getElementById('gradeSelector');
const gradesGrid = document.getElementById('gradesGrid');
const readingContent = document.getElementById('readingContent');
const loadingContainer = document.getElementById('loadingContainer');
const readingBody = document.getElementById('readingBody');
const topicInput = document.getElementById('topicInput');
const generateBtn = document.getElementById('generateBtn');
const articleContent = document.getElementById('articleContent');
const questionsList = document.getElementById('questionsList');
const submitBtn = document.getElementById('submitBtn');
const resultSection = document.getElementById('resultSection');
const resultSummary = document.getElementById('resultSummary');
const resultDetails = document.getElementById('resultDetails');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadGrades();
});

// 加载年级列表
async function loadGrades() {
    try {
        const response = await fetch('/api/chinese/reading/grades', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            renderGrades(data.grades);
        } else {
            alert('加载年级列表失败');
        }
    } catch (error) {
        console.error('加载年级失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染年级列表
function renderGrades(grades) {
    gradesGrid.innerHTML = '';
    grades.forEach(grade => {
        const card = document.createElement('div');
        card.className = 'grade-card';
        card.innerHTML = `
            <div class="grade-name">${grade.name}</div>
            <div class="grade-desc">${grade.description}</div>
        `;
        card.addEventListener('click', () => {
            selectGrade(grade);
        });
        gradesGrid.appendChild(card);
    });
}

// 选择年级
function selectGrade(grade) {
    currentGrade = grade;
    
    // 隐藏年级选择，显示阅读理解内容
    gradeSelector.style.display = 'none';
    readingContent.style.display = 'block';
    
    // 自动生成第一篇文章
    generateReading();
}

// 生成阅读理解
async function generateReading() {
    if (!currentGrade) {
        return;
    }
    
    // 显示加载状态
    loadingContainer.style.display = 'block';
    readingBody.style.display = 'none';
    resultSection.style.display = 'none';
    generateBtn.disabled = true;
    submitBtn.disabled = true;
    
    // 重置答案
    userAnswers = {};
    currentArticle = null;
    currentQuestions = [];
    currentAnswers = [];
    
    try {
        const topic = topicInput.value.trim();
        const response = await fetch('/api/chinese/reading/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                grade: currentGrade.id,
                topic: topic
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '生成失败');
        }
        
        const data = await response.json();
        
        // 保存数据
        currentArticle = data.article;
        currentQuestions = data.questions;
        currentAnswers = data.answers;
        
        // 渲染文章和题目
        renderArticle(data.article);
        renderQuestions(data.questions);
        
        // 显示内容
        loadingContainer.style.display = 'none';
        readingBody.style.display = 'block';
        generateBtn.disabled = false;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('生成阅读理解失败:', error);
        alert(`生成失败: ${error.message}`);
        loadingContainer.style.display = 'none';
        generateBtn.disabled = false;
    }
}

// 渲染文章
function renderArticle(article) {
    articleContent.textContent = article;
}

// 渲染题目
function renderQuestions(questions) {
    questionsList.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.dataset.questionId = question.number;
        
        let questionHtml = `
            <div class="question-header">
                <span class="question-number">${question.number}</span>
                <div class="question-text">${question.text}</div>
            </div>
        `;
        
        if (question.type === 'multiple_choice' && question.options && question.options.length > 0) {
            // 选择题
            questionHtml += '<div class="question-options">';
            question.options.forEach(option => {
                const optionId = `q${question.number}_${option.letter}`;
                questionHtml += `
                    <label class="option-item" for="${optionId}">
                        <input type="radio" 
                               name="question_${question.number}" 
                               id="${optionId}" 
                               value="${option.letter}"
                               onchange="setAnswer(${question.number}, '${option.letter}')">
                        <span class="option-letter">${option.letter}.</span>
                        <span class="option-text">${option.text}</span>
                    </label>
                `;
            });
            questionHtml += '</div>';
        } else {
            // 简答题
            questionHtml += `
                <textarea class="short-answer-input" 
                          placeholder="请输入你的答案..."
                          onchange="setAnswer(${question.number}, this.value)"
                          rows="3"></textarea>
            `;
        }
        
        questionItem.innerHTML = questionHtml;
        questionsList.appendChild(questionItem);
    });
}

// 设置答案
function setAnswer(questionId, answer) {
    userAnswers[questionId] = answer;
}

// 检查答案
async function checkAnswers() {
    if (!currentQuestions || currentQuestions.length === 0) {
        alert('请先生成题目');
        return;
    }
    
    // 检查是否所有题目都已作答
    const unanswered = currentQuestions.filter(q => !userAnswers[q.number]);
    if (unanswered.length > 0) {
        if (!confirm(`还有 ${unanswered.length} 道题未作答，确定要提交吗？`)) {
            return;
        }
    }
    
    submitBtn.disabled = true;
    
    try {
        // 构建答案数组
        const answersToCheck = currentQuestions.map(q => ({
            question_id: q.number,
            answer: userAnswers[q.number] || ''
        }));
        
        const correctAnswersToCheck = currentAnswers.map((ans, index) => ({
            question_id: index + 1,
            answer: ans.letter || ans.text || ''
        }));
        
        const response = await fetch('/api/chinese/reading/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                answers: answersToCheck,
                correct_answers: correctAnswersToCheck
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '检查答案失败');
        }
        
        const result = await response.json();
        
        // 显示结果
        showResults(result);
        
    } catch (error) {
        console.error('检查答案失败:', error);
        alert(`检查答案失败: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

// 显示结果
function showResults(result) {
    // 显示结果摘要
    resultSummary.innerHTML = `
        <div class="score">${result.correct} / ${result.total}</div>
        <div class="accuracy">正确率: ${result.accuracy}%</div>
    `;
    
    // 显示详细结果
    resultDetails.innerHTML = '';
    result.results.forEach((item, index) => {
        const question = currentQuestions[index];
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${item.is_correct ? 'correct' : 'wrong'}`;
        
        const statusIcon = item.is_correct ? '✓' : '✗';
        const statusText = item.is_correct ? '正确' : '错误';
        
        resultItem.innerHTML = `
            <div class="result-item-header">
                <span class="result-status">${statusIcon}</span>
                <strong>第${item.question_id}题: ${question.text}</strong>
            </div>
            <div class="result-answer">
                <div>你的答案: <strong>${item.user_answer || '未作答'}</strong></div>
                <div>正确答案: <strong>${item.correct_answer}</strong></div>
            </div>
        `;
        
        resultDetails.appendChild(resultItem);
    });
    
    // 显示结果区域
    resultSection.style.display = 'block';
    readingBody.style.display = 'none';
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 显示答案
function showAnswers() {
    // 在题目中标记正确答案
    currentQuestions.forEach((question, index) => {
        const answer = currentAnswers[index];
        const questionItem = document.querySelector(`[data-question-id="${question.number}"]`);
        
        if (questionItem) {
            if (question.type === 'multiple_choice') {
                // 标记正确答案
                const correctOption = questionItem.querySelector(`input[value="${answer.letter}"]`);
                if (correctOption) {
                    const optionItem = correctOption.closest('.option-item');
                    optionItem.style.background = '#d4f4dd';
                    optionItem.style.borderColor = '#43e97b';
                }
            } else {
                // 简答题显示答案
                const textarea = questionItem.querySelector('.short-answer-input');
                if (textarea) {
                    textarea.value = answer.text || answer.letter || '';
                    textarea.style.background = '#d4f4dd';
                    textarea.readOnly = true;
                }
            }
        }
    });
    
    // 隐藏结果区域，显示题目
    resultSection.style.display = 'none';
    readingBody.style.display = 'block';
}

// 返回年级选择
function backToGrades() {
    currentGrade = null;
    currentArticle = null;
    currentQuestions = [];
    currentAnswers = [];
    userAnswers = {};
    
    gradeSelector.style.display = 'block';
    readingContent.style.display = 'none';
}

