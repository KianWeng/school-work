#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化脚本
用于创建数据库表和默认用户
"""

from app import app, db, User
import hashlib

def init_database():
    """初始化数据库"""
    with app.app_context():
        # 创建所有表
        db.create_all()
        print('数据库表创建成功！')
        
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
        else:
            print('默认用户已存在')
        
        # 显示所有用户
        users = User.query.all()
        print(f'\n当前共有 {len(users)} 个用户:')
        for user in users:
            print(f'  - {user.username} ({user.name})')

if __name__ == '__main__':
    init_database()

