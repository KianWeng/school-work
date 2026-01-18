#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数学相关路由
"""

import os
import re
import random
from flask import Blueprint, render_template, jsonify, request, send_from_directory
from utils import login_required

math_bp = Blueprint('math', __name__)

# 胡小群数学思维启发目录路径
HUXIAOQUN_BASE_PATH = 'math/huxiaoqun'
HUXIAOQUN_L0_L2_PATH = os.path.join(HUXIAOQUN_BASE_PATH, '【思维突破】胡小群思维启发必修课L0-L2【40节】')
HUXIAOQUN_L3_L6_PATH = os.path.join(HUXIAOQUN_BASE_PATH, '【思维突破】胡小群思维启发必修课L3-L6【120节】')


@math_bp.route('/math/calculation')
@login_required
def calculation_page():
    """数学口算练习页面"""
    return render_template('calculation.html')


@math_bp.route('/api/math/calculation/generate', methods=['POST'])
@login_required
def generate_calculation_problems():
    """生成口算题目"""
    data = request.get_json()
    operation_type = data.get('operation_type', 'mixed')  # addition, subtraction, multiplication, division, mixed
    difficulty = data.get('difficulty', 'easy')  # easy, medium, hard
    count = data.get('count', 20)  # 题目数量
    
    problems = []
    
    for _ in range(count):
        if operation_type == 'mixed':
            # 随机选择运算类型
            op = random.choice(['+', '-', '×', '÷'])
        elif operation_type == 'addition':
            op = '+'
        elif operation_type == 'subtraction':
            op = '-'
        elif operation_type == 'multiplication':
            op = '×'
        elif operation_type == 'division':
            op = '÷'
        else:
            op = '+'
        
        # 根据难度生成题目
        if difficulty == 'easy':
            if op == '+':
                a = random.randint(1, 20)
                b = random.randint(1, 20)
                answer = a + b
            elif op == '-':
                a = random.randint(1, 20)
                b = random.randint(1, a)
                answer = a - b
            elif op == '×':
                a = random.randint(1, 9)
                b = random.randint(1, 9)
                answer = a * b
            elif op == '÷':
                b = random.randint(2, 9)
                answer = random.randint(1, 9)
                a = b * answer
        elif difficulty == 'medium':
            if op == '+':
                a = random.randint(10, 99)
                b = random.randint(10, 99)
                answer = a + b
            elif op == '-':
                a = random.randint(20, 99)
                b = random.randint(1, a - 10)
                answer = a - b
            elif op == '×':
                a = random.randint(2, 9)
                b = random.randint(10, 99)
                answer = a * b
            elif op == '÷':
                b = random.randint(2, 9)
                answer = random.randint(10, 99)
                a = b * answer
        else:  # hard
            if op == '+':
                a = random.randint(100, 999)
                b = random.randint(100, 999)
                answer = a + b
            elif op == '-':
                a = random.randint(100, 999)
                b = random.randint(1, a - 100)
                answer = a - b
            elif op == '×':
                a = random.randint(10, 99)
                b = random.randint(10, 99)
                answer = a * b
            elif op == '÷':
                b = random.randint(10, 99)
                answer = random.randint(10, 99)
                a = b * answer
        
        problems.append({
            'id': len(problems) + 1,
            'question': f'{a} {op} {b} =',
            'answer': answer,
            'operation': op
        })
    
    return jsonify({
        'success': True,
        'problems': problems,
        'total': len(problems)
    })


@math_bp.route('/api/math/calculation/check', methods=['POST'])
@login_required
def check_calculation_answer():
    """检查口算答案"""
    data = request.get_json()
    problem_id = data.get('problem_id')
    user_answer = data.get('answer')
    correct_answer = data.get('correct_answer')
    
    try:
        user_answer = int(user_answer)
        correct_answer = int(correct_answer)
        is_correct = user_answer == correct_answer
        
        return jsonify({
            'success': True,
            'is_correct': is_correct,
            'user_answer': user_answer,
            'correct_answer': correct_answer
        })
    except (ValueError, TypeError):
        return jsonify({
            'success': False,
            'error': '答案格式错误'
        }), 400

# ==================== 胡小群数学思维启发相关路由 ====================

def scan_huxiaoqun_courses():
    """扫描胡小群课程目录，返回所有可用的课程阶段"""
    courses = []
    
    # L0-L2阶段
    if os.path.exists(HUXIAOQUN_L0_L2_PATH):
        l0_l2_sections = []
        for item in os.listdir(HUXIAOQUN_L0_L2_PATH):
            item_path = os.path.join(HUXIAOQUN_L0_L2_PATH, item)
            if os.path.isdir(item_path) and not item.startswith('@') and not item.startswith('.'):
                # 解析章节：0-10讲、11-20讲等
                match = re.match(r'(\d+)-(\d+)讲', item)
                if match:
                    start = int(match.group(1))
                    end = int(match.group(2))
                    l0_l2_sections.append({
                        'id': item,
                        'name': item,
                        'start': start,
                        'end': end,
                        'path': item
                    })
        
        l0_l2_sections.sort(key=lambda x: x['start'])
        
        if l0_l2_sections:
            courses.append({
                'id': 'l0_l2',
                'name': 'L0-L2阶段（40节）',
                'display_name': 'L0-L2阶段',
                'description': '思维突破必修课L0-L2，共40节',
                'sections': l0_l2_sections,
                'base_path': HUXIAOQUN_L0_L2_PATH
            })
    
    # L3-L6阶段
    if os.path.exists(HUXIAOQUN_L3_L6_PATH):
        l3_l6_parts = []
        for item in os.listdir(HUXIAOQUN_L3_L6_PATH):
            item_path = os.path.join(HUXIAOQUN_L3_L6_PATH, item)
            if os.path.isdir(item_path) and not item.startswith('@') and not item.startswith('.'):
                # 解析Part：01.Part1 L3阶段、02.Part2 L4阶段等
                if item.startswith('0') and 'Part' in item:
                    match = re.search(r'Part(\d+)\s*L(\d+)', item)
                    if match:
                        part_num = int(match.group(1))
                        level = int(match.group(2))
                        l3_l6_parts.append({
                            'id': item,
                            'name': item,
                            'part': part_num,
                            'level': level,
                            'path': item
                        })
        
        l3_l6_parts.sort(key=lambda x: x['part'])
        
        if l3_l6_parts:
            courses.append({
                'id': 'l3_l6',
                'name': 'L3-L6阶段（120节）',
                'display_name': 'L3-L6阶段',
                'description': '思维突破必修课L3-L6，共120节',
                'parts': l3_l6_parts,
                'base_path': HUXIAOQUN_L3_L6_PATH
            })
    
    return courses


def get_lessons_by_section(course_id, section_path, base_path):
    """获取指定章节的所有课程"""
    lessons = []
    section_full_path = os.path.join(base_path, section_path)
    
    if not os.path.exists(section_full_path):
        return lessons
    
    for filename in os.listdir(section_full_path):
        if filename.endswith('.mp4') and not filename.startswith('.'):
            # 解析文件名：001.第1节：从对应到计数.mp4 或 01.第1节：计算（一）整数加减法巧算.mp4
            match = re.match(r'(\d+)\.第(\d+)节[：:]\s*(.+)\.mp4', filename)
            if match:
                file_num = int(match.group(1))
                lesson_num = int(match.group(2))
                lesson_title = match.group(3).strip()
                
                lessons.append({
                    'id': lesson_num,
                    'number': lesson_num,
                    'file_number': file_num,
                    'title': lesson_title,
                    'filename': filename,
                    'video_path': os.path.join(section_path, filename).replace('\\', '/')
                })
    
    # 按序号排序
    lessons.sort(key=lambda x: x['number'])
    return lessons


def get_pdf_files_for_course(course_id):
    """获取指定课程的PDF文件"""
    pdfs = {
        'exercises': [],  # 习题集
        'answers': [],    # 答案
        'handouts': []    # 电子讲义
    }
    
    if course_id == 'l3_l6':
        # L3-L6阶段的PDF文件
        exercises_path = os.path.join(HUXIAOQUN_L3_L6_PATH, '习题集与答案L3-L6（8册）')
        handouts_path = os.path.join(HUXIAOQUN_L3_L6_PATH, '小学数学一步到位电子讲义L3-L6（8册）')
        
        # 习题集和答案
        if os.path.exists(exercises_path):
            for filename in os.listdir(exercises_path):
                if filename.endswith('.pdf') and not filename.startswith('.'):
                    if '习题集' in filename:
                        level_match = re.search(r'L(\d+)', filename)
                        if level_match:
                            level = int(level_match.group(1))
                            pdfs['exercises'].append({
                                'name': f'L{level}习题集',
                                'filename': filename,
                                'path': f'习题集与答案L3-L6（8册）/{filename}',
                                'level': level
                            })
                    elif '解析版' in filename or '答案' in filename:
                        level_match = re.search(r'L(\d+)', filename)
                        if level_match:
                            level = int(level_match.group(1))
                            pdfs['answers'].append({
                                'name': f'L{level}解析版',
                                'filename': filename,
                                'path': f'习题集与答案L3-L6（8册）/{filename}',
                                'level': level
                            })
        
        # 电子讲义
        if os.path.exists(handouts_path):
            for filename in os.listdir(handouts_path):
                if filename.endswith('.pdf') and not filename.startswith('.'):
                    # 解析：01三年级上胡小群.pdf
                    match = re.match(r'(\d+)(.+)\.pdf', filename)
                    if match:
                        num = match.group(1)
                        name = match.group(2)
                        pdfs['handouts'].append({
                            'name': name,
                            'filename': filename,
                            'path': f'小学数学一步到位电子讲义L3-L6（8册）/{filename}',
                            'order': int(num)
                        })
        
        # 排序
        pdfs['exercises'].sort(key=lambda x: x['level'])
        pdfs['answers'].sort(key=lambda x: x['level'])
        pdfs['handouts'].sort(key=lambda x: x['order'])
    
    return pdfs


@math_bp.route('/math/huxiaoqun')
@login_required
def huxiaoqun_page():
    """胡小群数学思维启发页面"""
    return render_template('math_huxiaoqun.html')


@math_bp.route('/api/math/huxiaoqun/courses')
@login_required
def get_huxiaoqun_courses():
    """获取所有课程阶段列表"""
    courses = scan_huxiaoqun_courses()
    return jsonify({
        'total': len(courses),
        'courses': courses
    })


@math_bp.route('/api/math/huxiaoqun/course/<course_id>/sections')
@login_required
def get_huxiaoqun_sections(course_id):
    """获取指定课程的所有章节"""
    courses = scan_huxiaoqun_courses()
    course_info = None
    
    for course in courses:
        if course['id'] == course_id:
            course_info = course
            break
    
    if not course_info:
        return jsonify({'error': '课程不存在'}), 404
    
    if course_id == 'l0_l2':
        return jsonify({
            'course': course_info,
            'sections': course_info.get('sections', [])
        })
    elif course_id == 'l3_l6':
        return jsonify({
            'course': course_info,
            'parts': course_info.get('parts', [])
        })
    
    return jsonify({'error': '未知的课程类型'}), 400


@math_bp.route('/api/math/huxiaoqun/course/<course_id>/section/<section_id>/lessons')
@login_required
def get_huxiaoqun_lessons(course_id, section_id):
    """获取指定章节的所有课程"""
    courses = scan_huxiaoqun_courses()
    course_info = None
    
    for course in courses:
        if course['id'] == course_id:
            course_info = course
            break
    
    if not course_info:
        return jsonify({'error': '课程不存在'}), 404
    
    # 找到对应的章节
    section_path = None
    if course_id == 'l0_l2':
        for section in course_info.get('sections', []):
            if section['id'] == section_id:
                section_path = section['path']
                break
    elif course_id == 'l3_l6':
        for part in course_info.get('parts', []):
            if part['id'] == section_id:
                section_path = part['path']
                break
    
    if not section_path:
        return jsonify({'error': '章节不存在'}), 404
    
    lessons = get_lessons_by_section(course_id, section_path, course_info['base_path'])
    
    # 获取PDF文件（如果是L3-L6阶段）
    pdfs = {}
    if course_id == 'l3_l6':
        pdfs = get_pdf_files_for_course(course_id)
    
    return jsonify({
        'course': course_info,
        'section_id': section_id,
        'total': len(lessons),
        'lessons': lessons,
        'pdfs': pdfs
    })


@math_bp.route('/api/math/huxiaoqun/video/<path:video_path>')
@login_required
def get_huxiaoqun_video(video_path):
    """获取视频文件"""
    # 安全检查：确保路径在HUXIAOQUN_BASE_PATH下
    full_path = os.path.join(HUXIAOQUN_BASE_PATH, video_path)
    base_path = os.path.abspath(HUXIAOQUN_BASE_PATH)
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


@math_bp.route('/api/math/huxiaoqun/pdf/<path:pdf_path>')
@login_required
def get_huxiaoqun_pdf(pdf_path):
    """获取PDF文件"""
    # 安全检查：确保路径在HUXIAOQUN_BASE_PATH下
    full_path = os.path.join(HUXIAOQUN_BASE_PATH, pdf_path)
    base_path = os.path.abspath(HUXIAOQUN_BASE_PATH)
    full_path_abs = os.path.abspath(full_path)
    
    # 防止路径遍历攻击
    if not full_path_abs.startswith(base_path):
        return jsonify({'error': '无效的路径'}), 403
    
    if not os.path.exists(full_path_abs):
        return jsonify({'error': 'PDF文件不存在'}), 404
    
    # 获取目录和文件名
    directory = os.path.dirname(full_path_abs)
    filename = os.path.basename(full_path_abs)
    
    return send_from_directory(
        directory,
        filename,
        mimetype='application/pdf',
        as_attachment=True
    )
