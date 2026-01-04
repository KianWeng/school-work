#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小鱼快学 - 小学生智能学习平台
主应用入口文件
"""

import os
from flask import Flask
from flask_cors import CORS
from models import db, User
from blueprints import auth, main, english, math, chinese

# 创建 Flask 应用
app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 加载配置
try:
    from config import get_config
    config_class = get_config()
    app.config.from_object(config_class)
    print(f'✓ 已加载配置: {config_class.__name__}')
except ImportError:
    # 如果没有配置文件，使用默认配置
    print('⚠ 警告: 未找到配置文件 config.py，使用默认配置')
    print('  提示: 可以复制 config.example.py 为 config.py 并修改配置')
    app.config['JSON_AS_ASCII'] = False
    app.config['SECRET_KEY'] = os.urandom(24).hex()
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['TTS_API_URL'] = os.getenv('TTS_API_URL', 'http://localhost:5050/v1/audio/speech')
    app.config['TTS_API_KEY'] = os.getenv('TTS_API_KEY', 'your_api_key_here')
    app.config['TTS_VOICE'] = os.getenv('TTS_VOICE', 'en-US-JennyNeural')
    app.config['ASR_API_URL'] = os.getenv('ASR_API_URL', 'http://localhost:10095/v1/asr')
    app.config['ASR_API_KEY'] = os.getenv('ASR_API_KEY', 'your_asr_api_key_here')
    app.config['ASR_LANGUAGE'] = os.getenv('ASR_LANGUAGE', 'en')

# 初始化数据库
db.init_app(app)

# 注册蓝图
app.register_blueprint(auth.auth_bp)
app.register_blueprint(main.main_bp)
app.register_blueprint(english.english_bp)
app.register_blueprint(math.math_bp)
app.register_blueprint(chinese.chinese_bp)

# 初始化数据库表
def init_db():
    """初始化数据库"""
    with app.app_context():
        db.create_all()
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

if __name__ == '__main__':
    # 初始化数据库
    init_db()
    
    # 从配置获取服务器设置
    host = app.config.get('HOST', '0.0.0.0')
    port = app.config.get('PORT', 50000)
    debug = app.config.get('DEBUG', True)
    ssl_enabled = app.config.get('SSL_ENABLED', False)
    ssl_cert = app.config.get('SSL_CERT_PATH', 'ssl/server.crt')
    ssl_key = app.config.get('SSL_KEY_PATH', 'ssl/server.key')
    
    # 检查 SSL 证书文件是否存在
    if ssl_enabled:
        if not os.path.exists(ssl_cert) or not os.path.exists(ssl_key):
            print('⚠️  警告: SSL 已启用但证书文件不存在')
            print(f'   证书路径: {ssl_cert}')
            print(f'   私钥路径: {ssl_key}')
            print('   请参考 HTTPS_SETUP.md 生成证书，或设置 SSL_ENABLED=False')
            ssl_enabled = False
    
    protocol = 'https' if ssl_enabled else 'http'
    print(f'🚀 启动服务器: {protocol}://{host}:{port}')
    print(f'📝 调试模式: {debug}')
    if ssl_enabled:
        print(f'🔒 SSL 已启用')
        print(f'   证书: {ssl_cert}')
        print(f'   私钥: {ssl_key}')
        app.run(debug=debug, host=host, port=port, ssl_context=(ssl_cert, ssl_key))
    else:
        app.run(debug=debug, host=host, port=port)

