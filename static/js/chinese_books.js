// 语文课文学习页面JavaScript

let currentGrade = null;
let currentLessons = [];
let currentLessonIndex = -1;

// DOM元素
const gradeSelector = document.getElementById('gradeSelector');
const gradesGrid = document.getElementById('gradesGrid');
const lessonsContent = document.getElementById('lessonsContent');
const lessonsList = document.getElementById('lessonsList');
const gradeTitle = document.getElementById('gradeTitle');
const videoPlayerContainer = document.getElementById('videoPlayerContainer');
const lessonVideo = document.getElementById('lessonVideo');
const lessonTitle = document.getElementById('lessonTitle');
const prevLessonBtn = document.getElementById('prevLessonBtn');
const nextLessonBtn = document.getElementById('nextLessonBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadGrades();
});

// 加载年级列表
async function loadGrades() {
    try {
        const response = await fetch('/api/chinese/grades', {
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
            <div class="grade-number">${grade.number}年级</div>
            <div class="grade-name">${grade.display_name}</div>
        `;
        card.addEventListener('click', () => {
            selectGrade(grade);
        });
        gradesGrid.appendChild(card);
    });
}

// 选择年级
async function selectGrade(grade) {
    currentGrade = grade;
    
    // 隐藏年级选择，显示课文列表
    gradeSelector.style.display = 'none';
    lessonsContent.style.display = 'block';
    videoPlayerContainer.style.display = 'none';
    
    // 更新标题
    gradeTitle.textContent = `${grade.display_name} - 课文列表`;
    
    // 加载课文列表
    await loadLessons(grade.id);
}

// 加载课文列表
async function loadLessons(gradeId) {
    try {
        const response = await fetch(`/api/chinese/grade/${gradeId}/lessons`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            currentLessons = data.lessons;
            renderLessons(data.lessons);
        } else {
            alert('加载课文列表失败');
        }
    } catch (error) {
        console.error('加载课文失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染课文列表
function renderLessons(lessons) {
    lessonsList.innerHTML = '';
    lessons.forEach(lesson => {
        const item = document.createElement('div');
        item.className = 'lesson-item';
        item.innerHTML = `
            <div class="lesson-number">第${lesson.number}课</div>
            <div class="lesson-name">${lesson.name}</div>
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

// 播放课文
async function playLesson(lesson) {
    // 先停止当前播放的视频
    stopVideo();
    
    // 找到当前课文的索引
    currentLessonIndex = currentLessons.findIndex(l => l.id === lesson.id);
    
    // 隐藏课文列表，显示视频播放器
    lessonsContent.style.display = 'none';
    videoPlayerContainer.style.display = 'block';
    
    // 更新标题
    lessonTitle.textContent = `${currentGrade.display_name} - ${lesson.name}`;
    
    // 设置视频源
    const videoUrl = `/api/chinese/video/${lesson.video_path}`;
    lessonVideo.src = videoUrl;
    
    // 更新导航按钮状态
    updateNavButtons();
    
    // 加载课文详情（获取前后课文信息）
    try {
        const response = await fetch(`/api/chinese/lesson/${currentGrade.id}/${lesson.id}`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            // 可以在这里使用前后课文信息
            console.log('课文详情:', data);
        }
    } catch (error) {
        console.error('加载课文详情失败:', error);
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

// 返回年级选择
function backToGrades() {
    // 停止视频播放
    stopVideo();
    
    currentGrade = null;
    currentLessons = [];
    currentLessonIndex = -1;
    
    gradeSelector.style.display = 'block';
    lessonsContent.style.display = 'none';
    videoPlayerContainer.style.display = 'none';
}

// 返回课文列表
function backToLessons() {
    // 停止视频播放
    stopVideo();
    
    lessonsContent.style.display = 'block';
    videoPlayerContainer.style.display = 'none';
}

