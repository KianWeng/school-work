// 英语阅读页面JavaScript

let currentLevel = null;
let currentLessons = [];
let currentLessonIndex = -1;
let currentPdfs = null;

// DOM元素
const levelSelector = document.getElementById('levelSelector');
const levelsGrid = document.getElementById('levelsGrid');
const lessonsContent = document.getElementById('lessonsContent');
const lessonsList = document.getElementById('lessonsList');
const levelTitle = document.getElementById('levelTitle');
const pdfResources = document.getElementById('pdfResources');
const pdfLinks = document.getElementById('pdfLinks');
const videoPlayerContainer = document.getElementById('videoPlayerContainer');
const lessonVideo = document.getElementById('lessonVideo');
const lessonTitle = document.getElementById('lessonTitle');
const prevLessonBtn = document.getElementById('prevLessonBtn');
const nextLessonBtn = document.getElementById('nextLessonBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadLevels();
});

// 加载Level列表
async function loadLevels() {
    try {
        const response = await fetch('/api/english/reading/levels', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            renderLevels(data.levels);
        } else {
            alert('加载Level列表失败');
        }
    } catch (error) {
        console.error('加载Level失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染Level列表
function renderLevels(levels) {
    levelsGrid.innerHTML = '';
    levels.forEach(level => {
        const card = document.createElement('div');
        card.className = 'level-card';
        card.innerHTML = `
            <div class="level-number">${level.number}</div>
            <div class="level-name">${level.display_name}</div>
        `;
        card.addEventListener('click', () => {
            selectLevel(level);
        });
        levelsGrid.appendChild(card);
    });
}

// 选择Level
async function selectLevel(level) {
    currentLevel = level;
    
    // 隐藏Level选择，显示课程列表
    levelSelector.style.display = 'none';
    lessonsContent.style.display = 'block';
    videoPlayerContainer.style.display = 'none';
    
    // 更新标题
    levelTitle.textContent = `${level.display_name} - 课程列表`;
    
    // 加载课程列表
    await loadLessons(level.id);
}

// 加载课程列表
async function loadLessons(levelId) {
    try {
        const response = await fetch(`/api/english/reading/level/${levelId}/lessons`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            currentLessons = data.lessons;
            currentPdfs = data.pdfs || {};
            renderLessons(data.lessons);
            renderPdfResources(data.pdfs || {});
        } else {
            alert('加载课程列表失败');
        }
    } catch (error) {
        console.error('加载课程失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染PDF资源
function renderPdfResources(pdfs) {
    pdfLinks.innerHTML = '';
    
    // PDF类型配置
    const pdfTypes = [
        { key: 'book', name: '学生用书', icon: '📖' },
        { key: 'workbook', name: '练习册', icon: '✏️' },
        { key: 'log', name: '阅读日志', icon: '📝' },
        { key: 'answer', name: '答案', icon: '✅' }
    ];
    
    let hasPdfs = false;
    
    pdfTypes.forEach(type => {
        if (pdfs[type.key]) {
            hasPdfs = true;
            const pdf = pdfs[type.key];
            const link = document.createElement('a');
            link.className = 'pdf-link';
            link.href = `/api/english/reading/pdf/${type.key}/${pdf.path}`;
            link.download = pdf.filename;
            link.innerHTML = `
                <span class="pdf-icon">${type.icon}</span>
                <span class="pdf-name">${pdf.name}</span>
            `;
            pdfLinks.appendChild(link);
        }
    });
    
    // 如果有PDF资源，显示资源区域
    if (hasPdfs) {
        pdfResources.style.display = 'block';
    } else {
        pdfResources.style.display = 'none';
    }
}

// 渲染课程列表
function renderLessons(lessons) {
    lessonsList.innerHTML = '';
    lessons.forEach(lesson => {
        const item = document.createElement('div');
        item.className = 'lesson-item';
        item.innerHTML = `
            <div class="lesson-number">Lesson ${lesson.number}</div>
            <div class="lesson-title">${lesson.title}</div>
        `;
        item.addEventListener('click', () => {
            playLesson(lesson);
        });
        lessonsList.appendChild(item);
    });
}

// 停止视频播放
function stopVideo() {
    if (lessonVideo) {
        lessonVideo.pause();
        lessonVideo.currentTime = 0;
        lessonVideo.src = '';
    }
}

// 播放课程
async function playLesson(lesson) {
    // 先停止当前播放的视频
    stopVideo();
    
    // 找到当前课程的索引
    currentLessonIndex = currentLessons.findIndex(l => l.id === lesson.id);
    
    // 隐藏课程列表，显示视频播放器
    lessonsContent.style.display = 'none';
    videoPlayerContainer.style.display = 'block';
    
    // 更新标题
    lessonTitle.textContent = `${currentLevel.display_name} - Lesson ${lesson.number}: ${lesson.title}`;
    
    // 设置视频源
    const videoUrl = `/api/english/reading/video/${lesson.video_path}`;
    lessonVideo.src = videoUrl;
    
    // 更新导航按钮状态
    updateNavButtons();
    
    // 加载课程详情（获取前后课程信息）
    try {
        const response = await fetch(`/api/english/reading/lesson/${currentLevel.id}/${lesson.id}`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            console.log('课程详情:', data);
        }
    } catch (error) {
        console.error('加载课程详情失败:', error);
    }
}

// 更新导航按钮状态
function updateNavButtons() {
    prevLessonBtn.disabled = currentLessonIndex <= 0;
    nextLessonBtn.disabled = currentLessonIndex >= currentLessons.length - 1;
}

// 播放上一课
function playPrevLesson() {
    if (currentLessonIndex > 0) {
        const prevLesson = currentLessons[currentLessonIndex - 1];
        playLesson(prevLesson);
    }
}

// 播放下一课
function playNextLesson() {
    if (currentLessonIndex < currentLessons.length - 1) {
        const nextLesson = currentLessons[currentLessonIndex + 1];
        playLesson(nextLesson);
    }
}

// 返回Level选择
function backToLevels() {
    // 停止视频播放
    stopVideo();
    
    currentLevel = null;
    currentLessons = [];
    currentLessonIndex = -1;
    
    levelSelector.style.display = 'block';
    lessonsContent.style.display = 'none';
    videoPlayerContainer.style.display = 'none';
}

// 返回课程列表
function backToLessons() {
    // 停止视频播放
    stopVideo();
    
    lessonsContent.style.display = 'block';
    videoPlayerContainer.style.display = 'none';
}
