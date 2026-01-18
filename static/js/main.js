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
document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = await checkLoginStatus();
    if (isLoggedIn) {
        loadSubjects();
        setupEventListeners();
    }
    // 如果未登录，checkLoginStatus 已经处理了跳转，不需要执行其他操作
});

// 检查登录状态，返回是否已登录
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/info', {
            // 添加 credentials 确保发送 cookie/session
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const user = await response.json();
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = `欢迎，${user.name || user.id}！`;
            }
            return true; // 已登录
        } else if (response.status === 401) {
            // 未登录，跳转到登录页（静默处理，不显示错误）
            // 只在当前不在登录页时才跳转
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
            return false; // 未登录
        } else {
            // 其他错误，也跳转到登录页
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
            return false;
        }
    } catch (error) {
        // 网络错误时，不显示错误信息，静默处理
        // 只在当前不在登录页时才跳转
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            console.warn('检查登录状态失败，可能是网络问题');
        }
        return false;
    }
}

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

    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('确定要退出登录吗？')) {
                try {
                    const response = await fetch('/api/logout', {
                        method: 'POST'
                    });
                    if (response.ok) {
                        window.location.href = '/login';
                    }
                } catch (error) {
                    console.error('登出失败:', error);
                }
            }
        });
    }
}

// 加载学科列表
async function loadSubjects() {
    try {
        const response = await fetch('/api/subjects');
        if (response.status === 401) {
            // 未登录，跳转到登录页（只跳转一次）
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return;
        }
        if (!response.ok) {
            throw new Error('加载失败');
        }
        subjects = await response.json();
        renderSubjects();
    } catch (error) {
        console.error('加载学科失败:', error);
        // 网络错误不显示错误信息，避免干扰
        if (error.message === '加载失败') {
            showError('加载学科失败，请刷新页面重试');
        }
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
        // 更新当前学科
        currentSubject = subjectId;
        
        // 加载学科详情
        const response = await fetch(`/api/subject/${subjectId}`);
        if (response.status === 401) {
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return;
        }
        const subject = await response.json();
        
        // 加载模块列表
        const modulesResponse = await fetch(`/api/subject/${subjectId}/modules`);
        if (modulesResponse.status === 401) {
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return;
        }
        const modules = await modulesResponse.json();
        
        // 更新详情页面
        detailTitle.textContent = subject.name;
        detailDescription.textContent = subject.description;
        
        // 渲染模块（传递学科ID）
        renderModules(modules, subjectId);
        
        // 显示详情页面
        subjectsGrid.style.display = 'none';
        subjectDetail.style.display = 'block';
        
    } catch (error) {
        console.error('加载学科详情失败:', error);
        showError('加载学科详情失败，请重试');
    }
}

// 渲染模块
function renderModules(modules, subjectId) {
    modulesGrid.innerHTML = '';
    
    modules.forEach(module => {
        const card = createModuleCard(module, subjectId);
        modulesGrid.appendChild(card);
    });
}

// 创建模块卡片
function createModuleCard(module, subjectId) {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
        <div class="name">${module.name}</div>
        <div class="description">${module.description}</div>
    `;
    
    card.addEventListener('click', () => {
        // 处理模块点击
        if (module.id === 'vocabulary' && subjectId === 'english') {
            // 单词学习模块
            window.location.href = '/english/vocabulary';
        } else if (module.id === 'practice' && subjectId === 'english') {
            // 单词练习模块
            window.location.href = '/english/practice';
        } else if (module.id === 'speaking' && subjectId === 'english') {
            // 口语练习模块
            window.location.href = '/english/speaking';
        } else if (module.id === 'reading' && subjectId === 'english') {
            // 英语阅读模块
            window.location.href = '/english/reading';
        } else if (module.id === 'calculation' && subjectId === 'math') {
            // 数学口算练习模块
            window.location.href = '/math/calculation';
        } else if (module.id === 'books' && subjectId === 'chinese') {
            // 语文课文学习模块
            window.location.href = '/chinese/books';
        } else if (module.id === 'reading' && subjectId === 'chinese') {
            // 语文阅读理解模块
            window.location.href = '/chinese/reading';
        } else {
            console.log('点击模块:', module);
            alert(`即将打开: ${module.name}\n功能开发中...`);
        }
    });
    
    return card;
}

// 显示错误信息
function showError(message) {
    alert(message);
}


