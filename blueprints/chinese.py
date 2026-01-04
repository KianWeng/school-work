#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语文课文学习相关路由
"""

import os
import re
from flask import Blueprint, render_template, jsonify, request, send_from_directory, current_app
from utils import login_required

chinese_bp = Blueprint('chinese', __name__)

# 课文目录路径
BOOK_BASE_PATH = 'chinese/book'


def scan_grade_directories():
    """扫描年级目录，返回所有可用的年级"""
    grades = []
    base_path = BOOK_BASE_PATH
    
    if not os.path.exists(base_path):
        return grades
    
    for item in os.listdir(base_path):
        item_path = os.path.join(base_path, item)
        if os.path.isdir(item_path) and not item.startswith('@') and not item.startswith('.'):
            # 解析年级信息
            # 格式：01【完结 】一年级（上）语文动画
            match = re.search(r'(\d+)【.*?】(.+?)（([上下])）', item)
            if match:
                grade_num = int(match.group(1))
                grade_name = match.group(2)  # 一年级、二年级等
                semester = match.group(3)  # 上、下
                
                grades.append({
                    'id': f'{grade_num}_{semester}',
                    'number': grade_num,
                    'name': grade_name,
                    'semester': semester,
                    'display_name': f'{grade_name}（{semester}）',
                    'directory': item
                })
    
    # 按年级和学期排序
    grades.sort(key=lambda x: (x['number'], 0 if x['semester'] == '上' else 1))
    return grades


def get_lessons_by_grade(grade_dir):
    """获取指定年级目录下的所有课文"""
    lessons = []
    grade_path = os.path.join(BOOK_BASE_PATH, grade_dir)
    
    if not os.path.exists(grade_path):
        return lessons
    
    for filename in os.listdir(grade_path):
        if filename.endswith('.mp4') and not filename.startswith('.'):
            # 解析文件名：01.天地人.mp4
            match = re.match(r'(\d+)\.(.+)\.mp4', filename)
            if match:
                lesson_num = int(match.group(1))
                lesson_name = match.group(2)
                
                lessons.append({
                    'id': lesson_num,
                    'number': lesson_num,
                    'name': lesson_name,
                    'filename': filename,
                    'video_path': os.path.join(grade_dir, filename).replace('\\', '/')
                })
    
    # 按序号排序
    lessons.sort(key=lambda x: x['number'])
    return lessons


@chinese_bp.route('/chinese/books')
@login_required
def books_page():
    """课文学习页面"""
    return render_template('chinese_books.html')


@chinese_bp.route('/api/chinese/grades')
@login_required
def get_grades():
    """获取所有年级列表"""
    grades = scan_grade_directories()
    return jsonify({
        'total': len(grades),
        'grades': grades
    })


@chinese_bp.route('/api/chinese/grade/<grade_id>/lessons')
@login_required
def get_lessons(grade_id):
    """获取指定年级的所有课文"""
    # 根据 grade_id 找到对应的目录
    grades = scan_grade_directories()
    grade_info = None
    
    for grade in grades:
        if grade['id'] == grade_id:
            grade_info = grade
            break
    
    if not grade_info:
        return jsonify({'error': '年级不存在'}), 404
    
    lessons = get_lessons_by_grade(grade_info['directory'])
    
    return jsonify({
        'grade': grade_info,
        'total': len(lessons),
        'lessons': lessons
    })


@chinese_bp.route('/api/chinese/video/<path:video_path>')
@login_required
def get_video(video_path):
    """获取课文视频文件"""
    # 安全检查：确保路径在 BOOK_BASE_PATH 下
    full_path = os.path.join(BOOK_BASE_PATH, video_path)
    base_path = os.path.abspath(BOOK_BASE_PATH)
    full_path_abs = os.path.abspath(full_path)
    
    # 防止路径遍历攻击
    if not full_path_abs.startswith(base_path):
        return jsonify({'error': '无效的路径'}), 403
    
    if not os.path.exists(full_path_abs):
        return jsonify({'error': '视频文件不存在'}), 404
    
    # 获取目录和文件名
    directory = os.path.dirname(full_path_abs)
    filename = os.path.basename(full_path_abs)
    
    return send_from_directory(
        directory,
        filename,
        mimetype='video/mp4',
        as_attachment=False
    )


@chinese_bp.route('/api/chinese/lesson/<grade_id>/<int:lesson_id>')
@login_required
def get_lesson_detail(grade_id, lesson_id):
    """获取课文详情"""
    # 获取年级信息
    grades = scan_grade_directories()
    grade_info = None
    
    for grade in grades:
        if grade['id'] == grade_id:
            grade_info = grade
            break
    
    if not grade_info:
        return jsonify({'error': '年级不存在'}), 404
    
    # 获取课文列表
    lessons = get_lessons_by_grade(grade_info['directory'])
    lesson = None
    
    for l in lessons:
        if l['id'] == lesson_id:
            lesson = l
            break
    
    if not lesson:
        return jsonify({'error': '课文不存在'}), 404
    
    # 获取前后课文
    prev_lesson = None
    next_lesson = None
    
    for i, l in enumerate(lessons):
        if l['id'] == lesson_id:
            if i > 0:
                prev_lesson = lessons[i - 1]
            if i < len(lessons) - 1:
                next_lesson = lessons[i + 1]
            break
    
    return jsonify({
        'grade': grade_info,
        'lesson': lesson,
        'prev_lesson': prev_lesson,
        'next_lesson': next_lesson
    })

