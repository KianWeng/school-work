#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主路由（首页、学科等）
"""

from flask import Blueprint, render_template, jsonify
from utils import login_required

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
@login_required
def index():
    """首页"""
    return render_template('index.html')


@main_bp.route('/api/subjects')
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


@main_bp.route('/api/subject/<subject_id>')
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


@main_bp.route('/api/subject/<subject_id>/modules')
@login_required
def get_subject_modules(subject_id):
    """获取指定学科的模块列表"""
    modules = {
        'chinese': [
            {'id': 'books', 'name': '课文学习', 'description': '学习语文课文动画', 'icon': '📖'},
            {'id': 'reading', 'name': '阅读理解', 'description': 'AI生成阅读理解题目', 'icon': '📝'},
            {'id': 'hanzi', 'name': '汉字学习', 'description': '学习常用汉字'},
            {'id': 'poetry', 'name': '古诗词', 'description': '背诵古诗词'},
            {'id': 'writing', 'name': '作文练习', 'description': '练习写作'}
        ],
        'math': [
            {'id': 'calculation', 'name': '口算练习', 'description': '练习加减乘除', 'icon': '➕'},
            {'id': 'huxiaoqun', 'name': '胡小群数学思维启发', 'description': '思维突破必修课L0-L6', 'icon': '🧮'},
            {'id': 'word_problem', 'name': '应用题', 'description': '解决数学应用题'},
            {'id': 'geometry', 'name': '几何图形', 'description': '认识几何图形'},
            {'id': 'math_game', 'name': '数学游戏', 'description': '有趣的数学游戏'}
        ],
        'english': [
            {'id': 'vocabulary', 'name': '单词学习', 'description': '学习英语单词', 'icon': '📖'},
            {'id': 'practice', 'name': '单词练习', 'description': '练习单词记忆', 'icon': '✏️'},
            {'id': 'reading', 'name': '英语阅读', 'description': '学乐深度阅读指导课', 'icon': '📚'},
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

