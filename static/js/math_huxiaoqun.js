// 胡小群数学思维启发页面JavaScript

let currentCourse = null;
let currentSections = [];
let currentSection = null;
let currentLessons = [];
let currentLessonIndex = -1;
let currentPdfs = null;

// DOM元素
const courseSelector = document.getElementById('courseSelector');
const coursesGrid = document.getElementById('coursesGrid');
const sectionsContent = document.getElementById('sectionsContent');
const sectionsList = document.getElementById('sectionsList');
const courseTitle = document.getElementById('courseTitle');
const lessonsContent = document.getElementById('lessonsContent');
const lessonsList = document.getElementById('lessonsList');
const sectionTitle = document.getElementById('sectionTitle');
const pdfResources = document.getElementById('pdfResources');
const pdfLinks = document.getElementById('pdfLinks');
const videoPlayerContainer = document.getElementById('videoPlayerContainer');
const lessonVideo = document.getElementById('lessonVideo');
const lessonTitle = document.getElementById('lessonTitle');
const prevLessonBtn = document.getElementById('prevLessonBtn');
const nextLessonBtn = document.getElementById('nextLessonBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
});

// 加载课程列表
async function loadCourses() {
    try {
        const response = await fetch('/api/math/huxiaoqun/courses', {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            renderCourses(data.courses);
        } else {
            alert('加载课程列表失败');
        }
    } catch (error) {
        console.error('加载课程失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染课程列表
function renderCourses(courses) {
    coursesGrid.innerHTML = '';
    courses.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <div class="course-name">${course.display_name}</div>
            <div class="course-desc">${course.description}</div>
        `;
        card.addEventListener('click', () => {
            selectCourse(course);
        });
        coursesGrid.appendChild(card);
    });
}

// 选择课程
async function selectCourse(course) {
    currentCourse = course;
    
    // 隐藏课程选择，显示章节列表
    courseSelector.style.display = 'none';
    sectionsContent.style.display = 'block';
    lessonsContent.style.display = 'none';
    videoPlayerContainer.style.display = 'none';
    
    // 更新标题
    courseTitle.textContent = `${course.display_name} - 章节列表`;
    
    // 加载章节列表
    await loadSections(course.id);
}

// 加载章节列表
async function loadSections(courseId) {
    try {
        const response = await fetch(`/api/math/huxiaoqun/course/${courseId}/sections`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            if (courseId === 'l0_l2') {
                currentSections = data.sections || [];
                renderSections(data.sections || []);
            } else if (courseId === 'l3_l6') {
                currentSections = data.parts || [];
                renderSections(data.parts || []);
            }
        } else {
            alert('加载章节列表失败');
        }
    } catch (error) {
        console.error('加载章节失败:', error);
        alert('网络错误，请检查连接');
    }
}

// 渲染章节列表
function renderSections(sections) {
    sectionsList.innerHTML = '';
    sections.forEach(section => {
        const item = document.createElement('div');
        item.className = 'section-item';
        item.innerHTML = `
            <div class="section-name">${section.name}</div>
        `;
        item.addEventListener('click', () => {
            selectSection(section);
        });
        sectionsList.appendChild(item);
    });
}

// 选择章节
async function selectSection(section) {
    currentSection = section;
    
    // 隐藏章节列表，显示课程列表
    sectionsContent.style.display = 'none';
    lessonsContent.style.display = 'block';
    videoPlayerContainer.style.display = 'none';
    
    // 更新标题
    sectionTitle.textContent = `${currentCourse.display_name} - ${section.name}`;
    
    // 加载课程列表
    await loadLessons(currentCourse.id, section.id);
}

// 加载课程列表
async function loadLessons(courseId, sectionId) {
    try {
        const response = await fetch(`/api/math/huxiaoqun/course/${courseId}/section/${sectionId}/lessons`, {
            credentials: 'same-origin'
        });
        if (response.ok) {
            const data = await response.json();
            currentLessons = data.lessons || [];
            currentPdfs = data.pdfs || {};
            renderLessons(data.lessons || []);
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
    
    let hasPdfs = false;
    
    // 习题集
    if (pdfs.exercises && pdfs.exercises.length > 0) {
        hasPdfs = true;
        pdfs.exercises.forEach(pdf => {
            const link = document.createElement('a');
            link.className = 'pdf-link';
            link.href = `/api/math/huxiaoqun/pdf/${pdf.path}`;
            link.download = pdf.filename;
            link.innerHTML = `
                <span class="pdf-icon">📖</span>
                <span class="pdf-name">${pdf.name}</span>
            `;
            pdfLinks.appendChild(link);
        });
    }
    
    // 答案
    if (pdfs.answers && pdfs.answers.length > 0) {
        hasPdfs = true;
        pdfs.answers.forEach(pdf => {
            const link = document.createElement('a');
            link.className = 'pdf-link';
            link.href = `/api/math/huxiaoqun/pdf/${pdf.path}`;
            link.download = pdf.filename;
            link.innerHTML = `
                <span class="pdf-icon">✅</span>
                <span class="pdf-name">${pdf.name}</span>
            `;
            pdfLinks.appendChild(link);
        });
    }
    
    // 电子讲义
    if (pdfs.handouts && pdfs.handouts.length > 0) {
        hasPdfs = true;
        pdfs.handouts.forEach(pdf => {
            const link = document.createElement('a');
            link.className = 'pdf-link';
            link.href = `/api/math/huxiaoqun/pdf/${pdf.path}`;
            link.download = pdf.filename;
            link.innerHTML = `
                <span class="pdf-icon">📝</span>
                <span class="pdf-name">${pdf.name}</span>
            `;
            pdfLinks.appendChild(link);
        });
    }
    
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
            <div class="lesson-number">第${lesson.number}节</div>
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
    lessonTitle.textContent = `${currentCourse.display_name} - ${currentSection.name} - 第${lesson.number}节: ${lesson.title}`;
    
    // 构建视频路径
    const videoPath = `${currentCourse.id === 'l0_l2' ? '【思维突破】胡小群思维启发必修课L0-L2【40节】' : '【思维突破】胡小群思维启发必修课L3-L6【120节】'}/${currentSection.path}/${lesson.filename}`;
    const videoUrl = `/api/math/huxiaoqun/video/${videoPath}`;
    lessonVideo.src = videoUrl;
    
    // 更新导航按钮状态
    updateNavButtons();
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

// 返回课程选择
function backToCourses() {
    // 停止视频播放
    stopVideo();
    
    currentCourse = null;
    currentSections = [];
    currentSection = null;
    currentLessons = [];
    currentLessonIndex = -1;
    currentPdfs = null;
    
    courseSelector.style.display = 'block';
    sectionsContent.style.display = 'none';
    lessonsContent.style.display = 'none';
    videoPlayerContainer.style.display = 'none';
}

// 返回章节列表
function backToSections() {
    // 停止视频播放
    stopVideo();
    
    currentSection = null;
    currentLessons = [];
    currentLessonIndex = -1;
    currentPdfs = null;
    
    sectionsContent.style.display = 'block';
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
