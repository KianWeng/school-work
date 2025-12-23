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
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置
app.config['JSON_AS_ASCII'] = False  # 支持中文JSON
app.config['SECRET_KEY'] = os.urandom(24)  # 会话密钥
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # SQLite 数据库
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # 禁用修改跟踪

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
        json_file = 'english/ket_A.json'
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
        json_file = 'english/ket_A.json'
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
    app.run(debug=True, host='0.0.0.0', port=50000)

