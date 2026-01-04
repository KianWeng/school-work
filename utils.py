#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工具函数
"""

from functools import wraps
from flask import session, request, jsonify, redirect, url_for


def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # API 路由（以 /api/ 开头）总是返回 JSON
            if request.path.startswith('/api/'):
                return jsonify({'error': '请先登录', 'code': 'UNAUTHORIZED'}), 401
            # 其他路由重定向到登录页
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

