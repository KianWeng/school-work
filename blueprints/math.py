#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数学相关路由
"""

import random
from flask import Blueprint, render_template, jsonify, request
from utils import login_required

math_bp = Blueprint('math', __name__)


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

