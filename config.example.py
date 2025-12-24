#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置文件示例
复制此文件为 config.py 并修改相应的配置项
"""

import os

class Config:
    """应用配置类"""
    
    # ==================== Flask 基础配置 ====================
    # 会话密钥，生产环境请使用强随机密钥
    SECRET_KEY = 'your-secret-key-here-change-in-production'
    JSON_AS_ASCII = False
    
    # ==================== 数据库配置 ====================
    # SQLite 数据库路径
    SQLALCHEMY_DATABASE_URI = 'sqlite:///users.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ==================== 服务器配置 ====================
    HOST = '0.0.0.0'  # 监听所有网络接口
    PORT = 50000      # 端口号
    DEBUG = True      # 调试模式
    
    # ==================== TTS 语音服务配置 ====================
    # TTS API 地址
    TTS_API_URL = 'http://localhost:5050/v1/audio/speech'
    # TTS API 密钥
    TTS_API_KEY = 'your_api_key_here'
    # 默认语音（可选值见 TTS_CONFIG.md）
    TTS_VOICE = 'en-US-JennyNeural'
    # 默认语速（0.5 - 2.0）
    TTS_SPEED = 1.0
    
    # ==================== 文件路径配置 ====================
    WORD_DATA_DIR = 'english'
    KET_WORD_FILE = 'english/ket_A.json'
    OUTPUT_DIR = 'out'
    
    # ==================== 学习相关配置 ====================
    REVIEW_INTERVAL_DAYS = 2      # 复习间隔（天）
    MAX_REVIEW_INTERVAL = 30      # 最大复习间隔（天）
    WORDS_PER_PAGE = 20           # 每页单词数
    
    # ==================== 日志配置 ====================
    LOG_LEVEL = 'INFO'
    LOG_FILE = 'app.log'

