// 全局变量
let currentSubject = 'all';
let subjects = [];

// DOM 元素
const navTabs = document.querySelectorAll('.nav-tab');
const subjectsGrid = document.getElementById('subjectsGrid');
const subjectDetail = document.getElementById('subjectDetail');
const backBtn = document.getElementById('backBtn');
const detailTitle = document.getElementById('detailTitle');
const detailDescription = document.getElementById('detailDescription');
const modulesGrid = document.getElementById('modulesGrid');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 导航标签点击事件
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const subjectId = tab.getAttribute('data-subject');
            switchSubject(subjectId);
        });
    });

    // 返回按钮
    backBtn.addEventListener('click', () => {
        showSubjectsGrid();
    });
}

// 加载学科列表
async function loadSubjects() {
    try {
        const response = await fetch('/api/subjects');
        subjects = await response.json();
        renderSubjects();
    } catch (error) {
        console.error('加载学科失败:', error);
        showError('加载学科失败，请刷新页面重试');
    }
}

// 渲染学科卡片
function renderSubjects() {
    subjectsGrid.innerHTML = '';
    
    const filteredSubjects = currentSubject === 'all' 
        ? subjects 
        : subjects.filter(s => s.id === currentSubject);
    
    filteredSubjects.forEach(subject => {
        const card = createSubjectCard(subject);
        subjectsGrid.appendChild(card);
    });
}

// 创建学科卡片
function createSubjectCard(subject) {
    const card = document.createElement('div');
    card.className = `subject-card ${subject.id}`;
    card.innerHTML = `
        <div class="icon">${subject.icon}</div>
        <div class="name">${subject.name}</div>
        <div class="description">点击开始学习</div>
    `;
    
    card.addEventListener('click', () => {
        showSubjectDetail(subject.id);
    });
    
    return card;
}

// 切换学科
function switchSubject(subjectId) {
    currentSubject = subjectId;
    
    // 更新导航标签状态
    navTabs.forEach(tab => {
        if (tab.getAttribute('data-subject') === subjectId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 显示学科网格
    showSubjectsGrid();
    renderSubjects();
}

// 显示学科网格
function showSubjectsGrid() {
    subjectsGrid.style.display = 'grid';
    subjectDetail.style.display = 'none';
}

// 显示学科详情
async function showSubjectDetail(subjectId) {
    try {
        // 加载学科详情
        const response = await fetch(`/api/subject/${subjectId}`);
        const subject = await response.json();
        
        // 加载模块列表
        const modulesResponse = await fetch(`/api/subject/${subjectId}/modules`);
        const modules = await modulesResponse.json();
        
        // 更新详情页面
        detailTitle.textContent = subject.name;
        detailDescription.textContent = subject.description;
        
        // 渲染模块
        renderModules(modules);
        
        // 显示详情页面
        subjectsGrid.style.display = 'none';
        subjectDetail.style.display = 'block';
        
    } catch (error) {
        console.error('加载学科详情失败:', error);
        showError('加载学科详情失败，请重试');
    }
}

// 渲染模块
function renderModules(modules) {
    modulesGrid.innerHTML = '';
    
    modules.forEach(module => {
        const card = createModuleCard(module);
        modulesGrid.appendChild(card);
    });
}

// 创建模块卡片
function createModuleCard(module) {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
        <div class="name">${module.name}</div>
        <div class="description">${module.description}</div>
    `;
    
    card.addEventListener('click', () => {
        // 这里可以添加模块点击后的逻辑
        console.log('点击模块:', module);
        alert(`即将打开: ${module.name}\n功能开发中...`);
    });
    
    return card;
}

// 显示错误信息
function showError(message) {
    alert(message);
}

