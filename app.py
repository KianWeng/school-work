#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小学生学习平台 - 后端应用
"""

from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
import hashlib
import os
import re
import json
import requests
from datetime import datetime, timedelta
from io import BytesIO

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 加载配置
try:
    from config import get_config
    config_class = get_config()
    app.config.from_object(config_class)
    print(f'✓ 已加载配置: {config_class.__name__}')
except ImportError:
    # 如果没有配置文件，使用默认配置
    print('⚠ 警告: 未找到配置文件 config.py，使用默认配置')
    print('  提示: 可以复制 config.example.py 为 config.py 并修改配置')
    app.config['JSON_AS_ASCII'] = False
    app.config['SECRET_KEY'] = os.urandom(24).hex()
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['TTS_API_URL'] = os.getenv('TTS_API_URL', 'http://localhost:5050/v1/audio/speech')
    app.config['TTS_API_KEY'] = os.getenv('TTS_API_KEY', 'your_api_key_here')
    app.config['TTS_VOICE'] = os.getenv('TTS_VOICE', 'en-US-JennyNeural')

# 初始化数据库
db = SQLAlchemy(app)

# 用户模型
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(64), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def check_password(self, password):
        """检查密码是否正确"""
        password_hash = hashlib.md5(password.encode()).hexdigest()
        return self.password_hash == password_hash
    
    @staticmethod
    def hash_password(password):
        """生成密码哈希"""
        return hashlib.md5(password.encode()).hexdigest()

# 单词学习进度模型
class WordProgress(db.Model):
    __tablename__ = 'word_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(20), db.ForeignKey('users.username'), nullable=False, index=True)
    word = db.Column(db.String(100), nullable=False, index=True)
    textbook = db.Column(db.String(50), nullable=False, index=True)  # 教材：ket, new_concept, oxford等
    level = db.Column(db.String(20), nullable=True)  # 级别：A, B, C等
    status = db.Column(db.String(20), default='new')  # new, learning, mastered, review
    review_count = db.Column(db.Integer, default=0)
    last_review = db.Column(db.DateTime)
    next_review = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'word', 'textbook', name='unique_user_word'),)
    
    def __repr__(self):
        return f'<WordProgress {self.user_id}:{self.word}:{self.textbook}>'

# 错题记录模型
class WrongAnswer(db.Model):
    __tablename__ = 'wrong_answers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(20), db.ForeignKey('users.username'), nullable=False, index=True)
    word = db.Column(db.String(100), nullable=False, index=True)
    phonetic = db.Column(db.String(200), nullable=True)
    chinese = db.Column(db.String(200), nullable=False)
    textbook = db.Column(db.String(50), nullable=False, index=True)
    practice_mode = db.Column(db.String(50), nullable=False)  # chinese_to_english 或 english_to_chinese
    user_answer = db.Column(db.String(200), nullable=True)  # 用户的错误答案
    correct_answer = db.Column(db.String(200), nullable=False)  # 正确答案
    error_count = db.Column(db.Integer, default=1)  # 错误次数
    last_error_time = db.Column(db.DateTime, default=datetime.utcnow)  # 最近错误时间
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.Index('idx_user_word_mode', 'user_id', 'word', 'practice_mode'),)
    
    def __repr__(self):
        return f'<WrongAnswer {self.user_id}:{self.word}:{self.practice_mode}>'

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # API 路由（以 /api/ 开头）总是返回 JSON
            if request.path.startswith('/api/'):
                return jsonify({'error': '请先登录', 'code': 'UNAUTHORIZED'}), 401
            # 其他路由重定向到登录页
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    """登录页面"""
    if request.method == 'GET':
        # 如果已登录，重定向到首页
        if 'user_id' in session:
            return redirect(url_for('index'))
        return render_template('login.html')
    
    # POST 请求处理登录
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    remember = data.get('remember', False)
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    
    # 从数据库验证用户
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        session['user_id'] = user.username
        session['user_name'] = user.name
        if remember:
            session.permanent = True
        return jsonify({
            'success': True,
            'message': '登录成功',
            'user': {
                'id': user.username,
                'name': user.name
            }
        })
    
    return jsonify({'error': '用户名或密码错误'}), 401

@app.route('/register', methods=['GET', 'POST'])
def register():
    """注册页面"""
    if request.method == 'GET':
        # 如果已登录，重定向到首页
        if 'user_id' in session:
            return redirect(url_for('index'))
        return render_template('register.html')
    
    # POST 请求处理注册
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    confirm_password = data.get('confirmPassword', '').strip()
    name = data.get('name', '').strip()
    
    # 验证输入
    if not username or not password or not confirm_password or not name:
        return jsonify({'error': '所有字段都不能为空'}), 400
    
    # 验证用户名格式（3-20个字符，只能包含字母、数字和下划线）
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        return jsonify({'error': '用户名格式不正确，只能包含字母、数字和下划线，长度3-20个字符'}), 400
    
    # 验证密码长度
    if len(password) < 6:
        return jsonify({'error': '密码至少需要6个字符'}), 400
    
    # 验证两次密码是否一致
    if password != confirm_password:
        return jsonify({'error': '两次输入的密码不一致'}), 400
    
    # 检查用户名是否已存在
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': '用户名已存在，请选择其他用户名'}), 400
    
    # 注册新用户
    try:
        password_hash = User.hash_password(password)
        new_user = User(
            username=username,
            password_hash=password_hash,
            name=name
        )
        db.session.add(new_user)
        db.session.commit()
        
        # 自动登录
        session['user_id'] = username
        session['user_name'] = name
        
        return jsonify({
            'success': True,
            'message': '注册成功',
            'user': {
                'id': username,
                'name': name
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '注册失败，请稍后重试'}), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """登出"""
    session.clear()
    return jsonify({'success': True, 'message': '已退出登录'})

@app.route('/api/user/info')
@login_required
def get_user_info():
    """获取当前用户信息"""
    return jsonify({
        'id': session.get('user_id'),
        'name': session.get('user_name')
    })

@app.route('/')
@login_required
def index():
    """首页"""
    return render_template('index.html')

@app.route('/api/subjects')
@login_required
def get_subjects():
    """获取所有学科列表"""
    subjects = [
        {'id': 'chinese', 'name': '语文', 'icon': '📚'},
        {'id': 'math', 'name': '数学', 'icon': '🔢'},
        {'id': 'english', 'name': '英语', 'icon': '🔤'},
        {'id': 'science', 'name': '科学', 'icon': '🔬'}
    ]
    return jsonify(subjects)

@app.route('/api/subject/<subject_id>')
@login_required
def get_subject_content(subject_id):
    """获取指定学科的内容"""
    # 这里可以根据subject_id返回不同的内容
    content = {
        'chinese': {
            'name': '语文',
            'description': '学习汉字、古诗词、阅读理解等',
            'modules': ['汉字学习', '古诗词', '阅读理解', '作文练习']
        },
        'math': {
            'name': '数学',
            'description': '学习加减乘除、几何图形、应用题等',
            'modules': ['口算练习', '应用题', '几何图形', '数学游戏']
        },
        'english': {
            'name': '英语',
            'description': '学习单词、语法、听力、口语等',
            'modules': ['单词学习', '语法练习', '听力训练', '口语练习']
        },
        'science': {
            'name': '科学',
            'description': '学习自然现象、实验、科学知识等',
            'modules': ['自然现象', '科学实验', '动植物', '天文地理']
        }
    }
    
    if subject_id in content:
        return jsonify(content[subject_id])
    else:
        return jsonify({'error': '学科不存在'}), 404

@app.route('/api/subject/<subject_id>/modules')
@login_required
def get_subject_modules(subject_id):
    """获取指定学科的模块列表"""
    modules = {
        'chinese': [
            {'id': 'hanzi', 'name': '汉字学习', 'description': '学习常用汉字'},
            {'id': 'poetry', 'name': '古诗词', 'description': '背诵古诗词'},
            {'id': 'reading', 'name': '阅读理解', 'description': '阅读文章并回答问题'},
            {'id': 'writing', 'name': '作文练习', 'description': '练习写作'}
        ],
        'math': [
            {'id': 'calculation', 'name': '口算练习', 'description': '练习加减乘除'},
            {'id': 'word_problem', 'name': '应用题', 'description': '解决数学应用题'},
            {'id': 'geometry', 'name': '几何图形', 'description': '认识几何图形'},
            {'id': 'math_game', 'name': '数学游戏', 'description': '有趣的数学游戏'}
        ],
        'english': [
            {'id': 'vocabulary', 'name': '单词学习', 'description': '学习英语单词', 'icon': '📖'},
            {'id': 'practice', 'name': '单词练习', 'description': '练习单词记忆', 'icon': '✏️'},
            {'id': 'grammar', 'name': '语法练习', 'description': '练习英语语法', 'icon': '📝'},
            {'id': 'listening', 'name': '听力训练', 'description': '提高听力水平', 'icon': '🎧'},
            {'id': 'speaking', 'name': '口语练习', 'description': '练习英语口语', 'icon': '🗣️'}
        ],
        'science': [
            {'id': 'nature', 'name': '自然现象', 'description': '了解自然现象'},
            {'id': 'experiment', 'name': '科学实验', 'description': '进行科学实验'},
            {'id': 'biology', 'name': '动植物', 'description': '认识动植物'},
            {'id': 'astronomy', 'name': '天文地理', 'description': '学习天文地理知识'}
        ]
    }
    
    if subject_id in modules:
        return jsonify(modules[subject_id])
    else:
        return jsonify({'error': '学科不存在'}), 404

# ==================== 英语单词学习相关路由 ====================

@app.route('/english/vocabulary')
@login_required
def vocabulary_page():
    """单词学习页面"""
    return render_template('vocabulary.html')

@app.route('/english/practice')
@login_required
def practice_page():
    """单词练习页面"""
    return render_template('practice.html')

@app.route('/english/wrong-answers')
@login_required
def wrong_answers_page():
    """错题库页面"""
    return render_template('wrong_answers.html')

@app.route('/api/english/textbooks')
@login_required
def get_textbooks():
    """获取可用的教材列表"""
    textbooks = [
        {'id': 'ket', 'name': 'KET', 'description': '剑桥英语入门考试', 'icon': '📚'},
        # 预留扩展：新概念、牛津等
        # {'id': 'new_concept', 'name': '新概念英语', 'description': '经典英语教材', 'icon': '📖'},
        # {'id': 'oxford', 'name': '牛津英语', 'description': '牛津大学出版社教材', 'icon': '🎓'},
    ]
    return jsonify(textbooks)

@app.route('/api/english/textbook/<textbook_id>/words')
@login_required
def get_words(textbook_id):
    """获取指定教材的单词列表"""
    username = session.get('user_id')
    
    # 根据教材ID加载单词数据
    if textbook_id == 'ket':
        json_file = 'english/vocabulary/ket.json'
    else:
        return jsonify({'error': '不支持的教材'}), 404
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        words_list = []
        for letter, words in data.items():
            for word_data in words:
                word_item = {
                    'word': word_data.get('word', ''),
                    'phonetic': word_data.get('phonetic', ''),
                    'part_of_speech': word_data.get('part_of_speech', ''),
                    'chinese': word_data.get('chinese', ''),
                    'example': word_data.get('example', ''),
                    'letter': letter,
                    'textbook': textbook_id
                }
                
                # 获取用户学习进度
                progress = WordProgress.query.filter_by(
                    user_id=username,
                    word=word_item['word'],
                    textbook=textbook_id
                ).first()
                
                if progress:
                    word_item['progress'] = {
                        'status': progress.status,
                        'review_count': progress.review_count,
                        'last_review': progress.last_review.isoformat() if progress.last_review else None
                    }
                else:
                    word_item['progress'] = {
                        'status': 'new',
                        'review_count': 0,
                        'last_review': None
                    }
                
                words_list.append(word_item)
        
        return jsonify({
            'total': len(words_list),
            'words': words_list
        })
    except FileNotFoundError:
        return jsonify({'error': '单词数据文件不存在'}), 404
    except Exception as e:
        return jsonify({'error': f'加载单词数据失败: {str(e)}'}), 500

@app.route('/api/english/textbook/<textbook_id>/words/<letter>')
@login_required
def get_words_by_letter(textbook_id, letter):
    """按字母获取单词"""
    username = session.get('user_id')
    
    if textbook_id == 'ket':
        json_file = 'english/vocabulary/ket.json'
    else:
        return jsonify({'error': '不支持的教材'}), 404
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if letter.upper() not in data:
            return jsonify({'error': '字母不存在'}), 404
        
        words_list = []
        for word_data in data[letter.upper()]:
            word_item = {
                'word': word_data.get('word', ''),
                'phonetic': word_data.get('phonetic', ''),
                'part_of_speech': word_data.get('part_of_speech', ''),
                'chinese': word_data.get('chinese', ''),
                'example': word_data.get('example', ''),
                'letter': letter.upper(),
                'textbook': textbook_id
            }
            
            # 获取用户学习进度
            progress = WordProgress.query.filter_by(
                user_id=username,
                word=word_item['word'],
                textbook=textbook_id
            ).first()
            
            if progress:
                word_item['progress'] = {
                    'status': progress.status,
                    'review_count': progress.review_count,
                    'last_review': progress.last_review.isoformat() if progress.last_review else None
                }
            else:
                word_item['progress'] = {
                    'status': 'new',
                    'review_count': 0,
                    'last_review': None
                }
            
            words_list.append(word_item)
        
        return jsonify({
            'letter': letter.upper(),
            'total': len(words_list),
            'words': words_list
        })
    except FileNotFoundError:
        return jsonify({'error': '单词数据文件不存在'}), 404
    except Exception as e:
        return jsonify({'error': f'加载单词数据失败: {str(e)}'}), 500

@app.route('/api/english/word/progress', methods=['POST'])
@login_required
def update_word_progress():
    """更新单词学习进度"""
    username = session.get('user_id')
    data = request.get_json()
    
    word = data.get('word')
    textbook = data.get('textbook')
    status = data.get('status', 'learning')  # new, learning, mastered, review
    
    if not word or not textbook:
        return jsonify({'error': '参数不完整'}), 400
    
    # 查找或创建进度记录
    progress = WordProgress.query.filter_by(
        user_id=username,
        word=word,
        textbook=textbook
    ).first()
    
    if not progress:
        progress = WordProgress(
            user_id=username,
            word=word,
            textbook=textbook,
            status=status
        )
        db.session.add(progress)
    else:
        progress.status = status
        progress.updated_at = datetime.utcnow()
    
    # 更新复习相关字段
    if status == 'mastered':
        progress.review_count += 1
        progress.last_review = datetime.utcnow()
        # 设置下次复习时间（根据复习次数递增间隔）
        days = min(progress.review_count * 2, 30)  # 最多30天
        progress.next_review = datetime.utcnow() + timedelta(days=days)
    elif status == 'review':
        progress.review_count += 1
        progress.last_review = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': '进度更新成功',
            'progress': {
                'status': progress.status,
                'review_count': progress.review_count
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新失败: {str(e)}'}), 500

@app.route('/api/english/word/stats')
@login_required
def get_word_stats():
    """获取单词学习统计"""
    username = session.get('user_id')
    textbook = request.args.get('textbook', 'ket')
    
    total = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook
    ).count()
    
    new_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='new'
    ).count()
    
    learning_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='learning'
    ).count()
    
    mastered_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='mastered'
    ).count()
    
    review_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='review'
    ).count()
    
    return jsonify({
        'total': total,
        'new': new_count,
        'learning': learning_count,
        'mastered': mastered_count,
        'review': review_count
    })

@app.route('/api/english/word/speech', methods=['POST'])
@login_required
def generate_speech():
    """生成单词或句子的语音"""
    data = request.get_json()
    text = data.get('text', '').strip()
    voice = data.get('voice', app.config['TTS_VOICE'])
    speed = data.get('speed', 1.0)
    
    if not text:
        return jsonify({'error': '文本不能为空'}), 400
    
    # 清理文本：移除音标符号和特殊字符
    # 移除括号及其内容（词性描述等）
    text = re.sub(r'\([^)]*\)', '', text)
    # 移除 / 符号（用于音标标注和句子分隔）
    text = text.replace('/', ' ')
    # 移除多个连续空格
    text = re.sub(r'\s+', ' ', text)
    # 移除首尾空格
    text = text.strip()
    
    if not text:
        return jsonify({'error': '清理后的文本为空'}), 400
    
    # 记录请求信息（用于调试）
    print(f'TTS请求: 原始文本={data.get("text", "")[:50]}, 清理后={text[:50]}, voice={voice}, url={app.config["TTS_API_URL"]}')
    
    try:
        # 调用本地TTS API
        response = requests.post(
            app.config['TTS_API_URL'],
            headers={
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {app.config['TTS_API_KEY']}"
            },
            json={
                'input': text,
                'voice': voice,
                'response_format': 'mp3',
                'speed': speed
            },
            timeout=10
        )
        
        print(f'TTS响应状态码: {response.status_code}')
        
        if response.status_code == 200:
            # 检查响应内容类型
            content_type = response.headers.get('Content-Type', '')
            print(f'TTS响应Content-Type: {content_type}')
            
            # 返回音频数据
            return response.content, 200, {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': f'inline; filename="speech.mp3"',
                'Cache-Control': 'no-cache'
            }
        else:
            error_msg = f'TTS服务错误: {response.status_code}'
            try:
                error_detail = response.json() if response.text else '无详细信息'
            except:
                error_detail = response.text[:200] if response.text else '无详细信息'
            
            print(f'TTS错误: {error_msg}, 详情: {error_detail}')
            return jsonify({
                'error': error_msg,
                'details': error_detail,
                'status_code': response.status_code
            }), response.status_code
            
    except requests.exceptions.ConnectionError as e:
        error_msg = f'无法连接到TTS服务 ({app.config["TTS_API_URL"]})，请确保TTS服务正在运行'
        print(f'TTS连接错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'connection_error'}), 500
    except requests.exceptions.Timeout as e:
        error_msg = 'TTS服务响应超时，请稍后重试'
        print(f'TTS超时错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'timeout_error'}), 500
    except requests.exceptions.RequestException as e:
        error_msg = f'连接TTS服务失败: {str(e)}'
        print(f'TTS请求错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'request_error'}), 500
    except Exception as e:
        error_msg = f'生成语音失败: {str(e)}'
        print(f'TTS未知错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg, 'type': 'unknown_error'}), 500

@app.route('/api/english/voices')
@login_required
def get_voices():
    """获取可用的语音列表"""
    voices = [
        {'id': 'en-US-AnaNeural', 'name': 'Ana (Female)'},
        {'id': 'en-US-AndrewMultilingualNeural', 'name': 'Andrew Multilingual (Male)'},
        {'id': 'en-US-AndrewNeural', 'name': 'Andrew (Male)'},
        {'id': 'en-US-AriaNeural', 'name': 'Aria (Female)'},
        {'id': 'en-US-AvaMultilingualNeural', 'name': 'Ava Multilingual (Female)'},
        {'id': 'en-US-AvaNeural', 'name': 'Ava (Female)'},
        {'id': 'en-US-BrianMultilingualNeural', 'name': 'Brian Multilingual (Male)'},
        {'id': 'en-US-BrianNeural', 'name': 'Brian (Male)'},
        {'id': 'en-US-ChristopherNeural', 'name': 'Christopher (Male)'},
        {'id': 'en-US-EmmaMultilingualNeural', 'name': 'Emma Multilingual (Female)'},
        {'id': 'en-US-EmmaNeural', 'name': 'Emma (Female)'},
        {'id': 'en-US-EricNeural', 'name': 'Eric (Male)'},
        {'id': 'en-US-GuyNeural', 'name': 'Guy (Male)'},
        {'id': 'en-US-JennyNeural', 'name': 'Jenny (Female)'},
        {'id': 'en-US-MichelleNeural', 'name': 'Michelle (Female)'},
        {'id': 'en-US-RogerNeural', 'name': 'Roger (Male)'},
        {'id': 'en-US-SteffanNeural', 'name': 'Steffan (Male)'}
    ]
    return jsonify(voices)

# ==================== 错题相关路由 ====================

@app.route('/api/english/wrong-answer', methods=['POST'])
@login_required
def save_wrong_answer():
    """保存错题"""
    username = session.get('user_id')
    data = request.get_json()
    
    word = data.get('word')
    phonetic = data.get('phonetic', '')
    chinese = data.get('chinese', '')
    textbook = data.get('textbook')
    practice_mode = data.get('practice_mode')  # chinese_to_english 或 english_to_chinese
    user_answer = data.get('user_answer', '')
    correct_answer = data.get('correct_answer', '')
    
    if not word or not textbook or not practice_mode or not correct_answer:
        return jsonify({'error': '参数不完整'}), 400
    
    try:
        # 查找是否已有该错题记录
        wrong_answer = WrongAnswer.query.filter_by(
            user_id=username,
            word=word,
            textbook=textbook,
            practice_mode=practice_mode
        ).first()
        
        if wrong_answer:
            # 更新错误次数和最近错误时间
            wrong_answer.error_count += 1
            wrong_answer.last_error_time = datetime.utcnow()
            wrong_answer.user_answer = user_answer
            wrong_answer.updated_at = datetime.utcnow()
        else:
            # 创建新的错题记录
            wrong_answer = WrongAnswer(
                user_id=username,
                word=word,
                phonetic=phonetic,
                chinese=chinese,
                textbook=textbook,
                practice_mode=practice_mode,
                user_answer=user_answer,
                correct_answer=correct_answer,
                error_count=1,
                last_error_time=datetime.utcnow()
            )
            db.session.add(wrong_answer)
        
        db.session.commit()
        return jsonify({
            'success': True,
            'message': '错题已保存',
            'error_count': wrong_answer.error_count
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'保存错题失败: {str(e)}')
        return jsonify({'error': f'保存错题失败: {str(e)}'}), 500

@app.route('/api/english/wrong-answers')
@login_required
def get_wrong_answers():
    """获取用户的错题列表"""
    username = session.get('user_id')
    textbook = request.args.get('textbook', '')
    practice_mode = request.args.get('practice_mode', '')
    
    try:
        query = WrongAnswer.query.filter_by(user_id=username)
        
        if textbook:
            query = query.filter_by(textbook=textbook)
        if practice_mode:
            query = query.filter_by(practice_mode=practice_mode)
        
        # 按最近错误时间倒序排列
        wrong_answers = query.order_by(WrongAnswer.last_error_time.desc()).all()
        
        result = []
        for wa in wrong_answers:
            result.append({
                'id': wa.id,
                'word': wa.word,
                'phonetic': wa.phonetic,
                'chinese': wa.chinese,
                'textbook': wa.textbook,
                'practice_mode': wa.practice_mode,
                'user_answer': wa.user_answer,
                'correct_answer': wa.correct_answer,
                'error_count': wa.error_count,
                'last_error_time': wa.last_error_time.isoformat() if wa.last_error_time else None,
                'created_at': wa.created_at.isoformat() if wa.created_at else None
            })
        
        return jsonify({
            'total': len(result),
            'wrong_answers': result
        })
    except Exception as e:
        app.logger.error(f'获取错题列表失败: {str(e)}')
        return jsonify({'error': f'获取错题列表失败: {str(e)}'}), 500

@app.route('/api/english/wrong-answer/<int:wrong_id>', methods=['DELETE'])
@login_required
def delete_wrong_answer(wrong_id):
    """删除错题"""
    username = session.get('user_id')
    
    try:
        wrong_answer = WrongAnswer.query.filter_by(
            id=wrong_id,
            user_id=username
        ).first()
        
        if not wrong_answer:
            return jsonify({'error': '错题不存在'}), 404
        
        db.session.delete(wrong_answer)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '错题已删除'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'删除错题失败: {str(e)}')
        return jsonify({'error': f'删除错题失败: {str(e)}'}), 500

# 初始化数据库表
def init_db():
    """初始化数据库"""
    with app.app_context():
        db.create_all()
        # 检查是否已有默认用户
        default_user = User.query.filter_by(username='student').first()
        if not default_user:
            # 创建默认用户
            default_user = User(
                username='student',
                password_hash=User.hash_password('student'),
                name='学生'
            )
            db.session.add(default_user)
            db.session.commit()
            print('已创建默认用户: student/student')

if __name__ == '__main__':
    # 初始化数据库
    init_db()
    
    # 从配置获取服务器设置
    host = app.config.get('HOST', '0.0.0.0')
    port = app.config.get('PORT', 50000)
    debug = app.config.get('DEBUG', True)
    
    print(f'🚀 启动服务器: http://{host}:{port}')
    print(f'📝 调试模式: {debug}')
    app.run(debug=debug, host=host, port=port)

