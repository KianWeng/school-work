#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语文课文学习相关路由
"""

import os
import re
import json
import requests
from flask import Blueprint, render_template, jsonify, request, send_from_directory, current_app
from utils import login_required

chinese_bp = Blueprint('chinese', __name__)

# 课文目录路径
BOOK_BASE_PATH = 'chinese/book'

# 阅读理解各年级配置
READING_COMPREHENSION_PROMPTS = {
    'grade1': {
        'name': '一年级',
        'description': '适合一年级学生，文章简短，题目简单',
        'system_prompt': '''你是一位专业的小学语文老师，擅长为一年级学生编写阅读理解题目。

要求：
1. 文章长度：100-200字，内容简单易懂
2. 使用常用汉字，避免生僻字
3. 文章主题贴近一年级学生的生活经验（如：家庭、学校、动物、自然等）
4. 题目数量：3-5道题
5. 题目类型：选择题或简答题
6. 答案要准确、简洁

输出格式（必须严格遵守）：
[文章]
这里是文章内容
[/文章]

[题目]
1. 题目内容（A.选项1 B.选项2 C.选项3）
2. 题目内容（A.选项1 B.选项2 C.选项3）
3. 题目内容
...
[/题目]

[答案]
1. A（或：正确答案内容）
2. B（或：正确答案内容）
3. 正确答案内容
...
[/答案]'''
    },
    'grade2': {
        'name': '二年级',
        'description': '适合二年级学生，文章稍长，题目难度适中',
        'system_prompt': '''你是一位专业的小学语文老师，擅长为二年级学生编写阅读理解题目。

要求：
1. 文章长度：200-300字，内容生动有趣
2. 使用常用汉字，适当引入新词汇
3. 文章主题丰富（如：童话故事、自然现象、传统文化等）
4. 题目数量：4-6道题
5. 题目类型：选择题、判断题或简答题
6. 答案要准确、详细

输出格式（必须严格遵守）：
[文章]
这里是文章内容
[/文章]

[题目]
1. 题目内容（A.选项1 B.选项2 C.选项3）
2. 题目内容（A.选项1 B.选项2 C.选项3）
3. 题目内容
...
[/题目]

[答案]
1. A（或：正确答案内容）
2. B（或：正确答案内容）
3. 正确答案内容
...
[/答案]'''
    },
    'grade3': {
        'name': '三年级',
        'description': '适合三年级学生，文章较长，题目有一定难度',
        'system_prompt': '''你是一位专业的小学语文老师，擅长为三年级学生编写阅读理解题目。

要求：
1. 文章长度：300-400字，内容有深度
2. 使用较丰富的词汇，可以包含一些成语
3. 文章主题多样（如：历史故事、科学知识、人物传记等）
4. 题目数量：5-7道题
5. 题目类型：选择题、判断题、简答题或问答题
6. 答案要准确、完整，包含必要的解释

输出格式（必须严格遵守）：
[文章]
这里是文章内容
[/文章]

[题目]
1. 题目内容（A.选项1 B.选项2 C.选项3）
2. 题目内容（A.选项1 B.选项2 C.选项3）
3. 题目内容
...
[/题目]

[答案]
1. A（或：正确答案内容）
2. B（或：正确答案内容）
3. 正确答案内容
...
[/答案]'''
    },
    'grade4': {
        'name': '四年级',
        'description': '适合四年级学生，文章较长，题目难度较高',
        'system_prompt': '''你是一位专业的小学语文老师，擅长为四年级学生编写阅读理解题目。

要求：
1. 文章长度：400-500字，内容有思想性
2. 使用丰富的词汇和表达方式，可以包含成语、古诗词等
3. 文章主题广泛（如：历史事件、科学探索、文学作品等）
4. 题目数量：6-8道题
5. 题目类型：选择题、判断题、简答题、问答题
6. 答案要准确、详细，包含分析和解释

输出格式（必须严格遵守）：
[文章]
这里是文章内容
[/文章]

[题目]
1. 题目内容（A.选项1 B.选项2 C.选项3）
2. 题目内容（A.选项1 B.选项2 C.选项3）
3. 题目内容
...
[/题目]

[答案]
1. A（或：正确答案内容）
2. B（或：正确答案内容）
3. 正确答案内容
...
[/答案]'''
    },
    'grade5': {
        'name': '五年级',
        'description': '适合五年级学生，文章较长，题目难度高',
        'system_prompt': '''你是一位专业的小学语文老师，擅长为五年级学生编写阅读理解题目。

要求：
1. 文章长度：500-600字，内容有深度和思想性
2. 使用丰富的词汇、成语、古诗词等
3. 文章主题深入（如：历史人物、科学发现、文学作品、社会现象等）
4. 题目数量：7-10道题
5. 题目类型：选择题、判断题、简答题、问答题、分析题
6. 答案要准确、详细，包含深入的分析和解释

输出格式（必须严格遵守）：
[文章]
这里是文章内容
[/文章]

[题目]
1. 题目内容（A.选项1 B.选项2 C.选项3）
2. 题目内容（A.选项1 B.选项2 C.选项3）
3. 题目内容
...
[/题目]

[答案]
1. A（或：正确答案内容）
2. B（或：正确答案内容）
3. 正确答案内容
...
[/答案]'''
    },
    'grade6': {
        'name': '六年级',
        'description': '适合六年级学生，文章较长，题目难度最高',
        'system_prompt': '''你是一位专业的小学语文老师，擅长为六年级学生编写阅读理解题目。

要求：
1. 文章长度：600-800字，内容有深度和思想性
2. 使用丰富的词汇、成语、古诗词、文言文等
3. 文章主题深入（如：历史事件、科学发现、文学作品、社会现象、人生哲理等）
4. 题目数量：8-12道题
5. 题目类型：选择题、判断题、简答题、问答题、分析题、综合题
6. 答案要准确、详细，包含深入的分析、解释和思考

输出格式（必须严格遵守）：
[文章]
这里是文章内容
[/文章]

[题目]
1. 题目内容（A.选项1 B.选项2 C.选项3）
2. 题目内容（A.选项1 B.选项2 C.选项3）
3. 题目内容
...
[/题目]

[答案]
1. A（或：正确答案内容）
2. B（或：正确答案内容）
3. 正确答案内容
...
[/答案]'''
    }
}


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


# ==================== 阅读理解相关路由 ====================

def parse_reading_comprehension(ai_response):
    """解析AI返回的阅读理解内容"""
    result = {
        'article': '',
        'questions': [],
        'answers': []
    }
    
    # 提取文章
    article_match = re.search(r'\[文章\](.*?)\[/文章\]', ai_response, re.DOTALL)
    if article_match:
        result['article'] = article_match.group(1).strip()
    
    # 提取题目
    questions_match = re.search(r'\[题目\](.*?)\[/题目\]', ai_response, re.DOTALL)
    if questions_match:
        questions_text = questions_match.group(1).strip()
        # 按行分割题目
        question_lines = [line.strip() for line in questions_text.split('\n') if line.strip()]
        question_num = 1
        current_question = None
        
        for line in question_lines:
            # 检查是否是题目编号（支持多种格式：1. 1、 1）等）
            if re.match(r'^\d+[\.、）)]', line):
                if current_question:
                    result['questions'].append(current_question)
                # 提取题目内容
                question_text = re.sub(r'^\d+[\.、）)]\s*', '', line)
                current_question = {
                    'number': question_num,
                    'text': question_text,
                    'type': 'multiple_choice' if re.search(r'[A-Z][\.、）)]', question_text) else 'short_answer',
                    'options': []
                }
                question_num += 1
                
                # 提取选择题选项（支持多种格式）
                if current_question['type'] == 'multiple_choice':
                    # 匹配选项：A. 或 A、 或 A）
                    options_pattern = r'([A-Z])[\.、）)]\s*([^A-Z]+?)(?=[A-Z][\.、）)]|$)'
                    options_match = re.findall(options_pattern, question_text)
                    for opt_letter, opt_text in options_match:
                        current_question['options'].append({
                            'letter': opt_letter,
                            'text': opt_text.strip()
                        })
            elif current_question:
                # 可能是题目的续行或选项的续行
                # 检查是否是新的选项
                if re.match(r'^[A-Z][\.、）)]', line):
                    # 这是新选项
                    opt_match = re.match(r'^([A-Z])[\.、）)]\s*(.+)', line)
                    if opt_match:
                        current_question['options'].append({
                            'letter': opt_match.group(1),
                            'text': opt_match.group(2).strip()
                        })
                else:
                    # 题目的续行
                    current_question['text'] += ' ' + line
        
        # 添加最后一个题目
        if current_question:
            result['questions'].append(current_question)
    
    # 提取答案
    answers_match = re.search(r'\[答案\](.*?)\[/答案\]', ai_response, re.DOTALL)
    if answers_match:
        answers_text = answers_match.group(1).strip()
        answer_lines = [line.strip() for line in answers_text.split('\n') if line.strip()]
        
        for line in answer_lines:
            # 提取答案编号和内容（支持多种格式）
            answer_match = re.match(r'^\d+[\.、）)]\s*(.+)', line)
            if answer_match:
                answer_content = answer_match.group(1).strip()
                # 提取选项字母（如果有，支持多种格式）
                letter_match = re.match(r'^([A-Z])[\.、）)]?\s*(.*)', answer_content)
                if letter_match:
                    letter = letter_match.group(1)
                    text = letter_match.group(2).strip() if letter_match.group(2) else letter
                    result['answers'].append({
                        'letter': letter,
                        'text': text
                    })
                else:
                    result['answers'].append({
                        'letter': None,
                        'text': answer_content
                    })
    
    return result


@chinese_bp.route('/chinese/reading')
@login_required
def reading_page():
    """阅读理解页面"""
    return render_template('chinese_reading.html')


@chinese_bp.route('/api/chinese/reading/grades')
@login_required
def get_reading_grades():
    """获取阅读理解年级列表"""
    grades = []
    for grade_id, grade_info in READING_COMPREHENSION_PROMPTS.items():
        grades.append({
            'id': grade_id,
            'name': grade_info['name'],
            'description': grade_info['description']
        })
    return jsonify({
        'total': len(grades),
        'grades': grades
    })


@chinese_bp.route('/api/chinese/reading/generate', methods=['POST'])
@login_required
def generate_reading_comprehension():
    """生成阅读理解题目"""
    data = request.get_json()
    grade = data.get('grade', 'grade1')
    topic = data.get('topic', '')  # 可选的主题
    
    if grade not in READING_COMPREHENSION_PROMPTS:
        return jsonify({'error': '无效的年级'}), 400
    
    grade_config = READING_COMPREHENSION_PROMPTS[grade]
    
    # 构建用户提示
    if topic:
        user_prompt = f'''请为{grade_config['name']}学生生成一篇关于"{topic}"的阅读理解文章和题目。

要求：
- 严格按照输出格式输出
- 文章要生动有趣，适合{grade_config['name']}学生的认知水平
- 题目要有针对性，能够考察学生对文章的理解
- 答案要准确清晰

请开始生成：'''
    else:
        user_prompt = f'''请为{grade_config['name']}学生生成一篇阅读理解文章和题目。

要求：
- 严格按照输出格式输出
- 文章要生动有趣，适合{grade_config['name']}学生的认知水平
- 题目要有针对性，能够考察学生对文章的理解
- 答案要准确清晰

请开始生成：'''
    
    # 构建消息列表
    messages = [
        {'role': 'system', 'content': grade_config['system_prompt']},
        {'role': 'user', 'content': user_prompt}
    ]
    
    try:
        import time
        start_time = time.time()
        
        # 根据年级设置不同的超时时间和max_tokens
        # 高年级需要更长的超时时间和更多的tokens
        grade_timeout_map = {
            'grade1': 45,
            'grade2': 50,
            'grade3': 55,
            'grade4': 60,
            'grade5': 70,
            'grade6': 90  # 六年级最长，90秒
        }
        grade_tokens_map = {
            'grade1': 1500,
            'grade2': 1800,
            'grade3': 2200,
            'grade4': 2600,
            'grade5': 3000,
            'grade6': 3500  # 六年级最多tokens
        }
        
        timeout = grade_timeout_map.get(grade, current_app.config.get('AI_TIMEOUT', 60))
        max_tokens = grade_tokens_map.get(grade, 2000)
        
        print(f'[DEBUG] 生成阅读理解 - 年级: {grade}, 超时时间: {timeout}秒, max_tokens: {max_tokens}')
        
        # 调用AI API
        response = requests.post(
            current_app.config['AI_API_URL'],
            headers={
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {current_app.config['AI_API_KEY']}"
            },
            json={
                'model': current_app.config['AI_MODEL'],
                'messages': messages,
                'temperature': 0.7,
                'max_tokens': max_tokens,
                'stream': False
            },
            timeout=timeout
        )
        
        ai_api_time = time.time() - start_time
        print(f'[性能] AI API调用耗时: {ai_api_time:.2f}秒')
        
        if response.status_code == 200:
            result = response.json()
            ai_content = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            
            # 解析AI返回的内容
            parsed_result = parse_reading_comprehension(ai_content)
            
            # 验证解析结果
            if not parsed_result['article']:
                return jsonify({
                    'error': 'AI返回的内容格式不正确，未能解析出文章',
                    'raw_content': ai_content[:500]  # 返回前500字符用于调试
                }), 500
            
            if not parsed_result['questions']:
                return jsonify({
                    'error': 'AI返回的内容格式不正确，未能解析出题目',
                    'raw_content': ai_content[:500]
                }), 500
            
            return jsonify({
                'success': True,
                'grade': grade,
                'article': parsed_result['article'],
                'questions': parsed_result['questions'],
                'answers': parsed_result['answers'],
                'raw_content': ai_content  # 用于调试
            })
        else:
            error_msg = f'AI服务错误: {response.status_code}'
            try:
                error_detail = response.json()
            except:
                error_detail = response.text[:200] if response.text else '无详细信息'
            
            print(f'AI API错误: {error_msg}, 详情: {error_detail}')
            return jsonify({
                'error': error_msg,
                'details': error_detail
            }), response.status_code
            
    except requests.exceptions.ConnectionError as e:
        error_msg = f'无法连接到AI服务 ({current_app.config["AI_API_URL"]})'
        print(f'AI连接错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'connection_error'}), 500
    except requests.exceptions.Timeout as e:
        error_msg = 'AI服务响应超时，请稍后重试'
        print(f'AI超时错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'timeout_error'}), 500
    except Exception as e:
        error_msg = f'生成阅读理解失败: {str(e)}'
        print(f'AI未知错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg, 'type': 'unknown_error'}), 500


@chinese_bp.route('/api/chinese/reading/check', methods=['POST'])
@login_required
def check_reading_answers():
    """检查阅读理解答案"""
    data = request.get_json()
    user_answers = data.get('answers', [])  # [{question_id: 1, answer: 'A'}, ...]
    correct_answers = data.get('correct_answers', [])  # [{question_id: 1, answer: 'A'}, ...]
    
    if not user_answers or not correct_answers:
        return jsonify({'error': '答案数据不完整'}), 400
    
    # 检查答案
    results = []
    correct_count = 0
    total_count = len(correct_answers)
    
    for correct in correct_answers:
        question_id = correct.get('question_id') or correct.get('number')
        correct_answer = correct.get('answer') or correct.get('text') or correct.get('letter')
        
        # 找到用户对应的答案
        user_answer_obj = next((ua for ua in user_answers if (ua.get('question_id') or ua.get('number')) == question_id), None)
        user_answer = user_answer_obj.get('answer') if user_answer_obj else None
        
        # 比较答案（不区分大小写）
        is_correct = False
        if user_answer and correct_answer:
            # 如果是字母答案，直接比较
            if isinstance(correct_answer, str) and len(correct_answer) == 1 and correct_answer.isalpha():
                is_correct = user_answer.upper() == correct_answer.upper()
            else:
                # 文本答案，进行模糊匹配
                user_ans_clean = str(user_answer).strip().upper()
                correct_ans_clean = str(correct_answer).strip().upper()
                is_correct = user_ans_clean == correct_ans_clean or user_ans_clean in correct_ans_clean or correct_ans_clean in user_ans_clean
        
        if is_correct:
            correct_count += 1
        
        results.append({
            'question_id': question_id,
            'user_answer': user_answer,
            'correct_answer': correct_answer,
            'is_correct': is_correct
        })
    
    accuracy = (correct_count / total_count * 100) if total_count > 0 else 0
    
    return jsonify({
        'success': True,
        'total': total_count,
        'correct': correct_count,
        'wrong': total_count - correct_count,
        'accuracy': round(accuracy, 1),
        'results': results
    })

