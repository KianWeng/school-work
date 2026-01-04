#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库模型
"""

import hashlib
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# 这个 db 对象将在 app.py 中初始化
db = SQLAlchemy()


class User(db.Model):
    """用户模型"""
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
        if not password:
            return False
        # 确保密码是字符串类型，并移除前后空格
        password = str(password).strip()
        # 使用 UTF-8 编码确保一致性
        password_hash = hashlib.md5(password.encode('utf-8')).hexdigest()
        return self.password_hash == password_hash
    
    @staticmethod
    def hash_password(password):
        """生成密码哈希"""
        return hashlib.md5(password.encode()).hexdigest()


class WordProgress(db.Model):
    """单词学习进度模型"""
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


class WrongAnswer(db.Model):
    """错题记录模型"""
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

