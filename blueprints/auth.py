#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
认证相关路由
"""

import re
from flask import Blueprint, render_template, jsonify, request, session, redirect, url_for
from models import db, User
from utils import login_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """登录页面"""
    if request.method == 'GET':
        # 如果已登录，重定向到首页
        if 'user_id' in session:
            return redirect(url_for('main.index'))
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
    if user:
        # 调试信息：打印密码相关信息（仅用于调试，生产环境应移除）
        import hashlib
        input_hash = hashlib.md5(password.encode()).hexdigest()
        print(f"[DEBUG] 登录尝试 - 用户名: {username}")
        print(f"[DEBUG] 输入密码长度: {len(password)}")
        print(f"[DEBUG] 输入密码哈希: {input_hash}")
        print(f"[DEBUG] 存储密码哈希: {user.password_hash}")
        print(f"[DEBUG] 哈希匹配: {input_hash == user.password_hash}")
        
        if user.check_password(password):
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


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """注册页面"""
    if request.method == 'GET':
        # 如果已登录，重定向到首页
        if 'user_id' in session:
            return redirect(url_for('main.index'))
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
        # 调试信息：打印注册相关信息（仅用于调试，生产环境应移除）
        print(f"[DEBUG] 注册新用户 - 用户名: {username}")
        print(f"[DEBUG] 注册密码长度: {len(password)}")
        print(f"[DEBUG] 注册密码哈希: {password_hash}")
        
        new_user = User(
            username=username,
            password_hash=password_hash,
            name=name
        )
        db.session.add(new_user)
        db.session.commit()
        
        # 验证用户是否成功创建
        verify_user = User.query.filter_by(username=username).first()
        if verify_user:
            print(f"[DEBUG] 用户创建成功，存储的密码哈希: {verify_user.password_hash}")
        
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


@auth_bp.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """登出"""
    session.clear()
    return jsonify({'success': True, 'message': '已退出登录'})


@auth_bp.route('/api/user/info')
@login_required
def get_user_info():
    """获取当前用户信息"""
    return jsonify({
        'id': session.get('user_id'),
        'name': session.get('user_name')
    })

