#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
英语相关路由（单词学习、口语练习、错题等）
"""

import re
import json
import requests
from datetime import datetime, timedelta
from flask import Blueprint, render_template, jsonify, request, session, current_app
from models import db, WordProgress, WrongAnswer
from utils import login_required
from whisper_client import recognize_speech_whisper

english_bp = Blueprint('english', __name__)

# ==================== 英语单词学习相关路由 ====================

@english_bp.route('/english/vocabulary')
@login_required
def vocabulary_page():
    """单词学习页面"""
    return render_template('vocabulary.html')

@english_bp.route('/english/practice')
@login_required
def practice_page():
    """单词练习页面"""
    return render_template('practice.html')

@english_bp.route('/english/wrong-answers')
@login_required
def wrong_answers_page():
    """错题库页面"""
    return render_template('wrong_answers.html')

@english_bp.route('/api/english/textbooks')
@login_required
def get_textbooks():
    """获取可用的教材列表"""
    textbooks = [
        {'id': 'ket', 'name': 'KET', 'description': '剑桥英语入门考试', 'icon': '📚'},
        # 预留扩展：新概念、牛津等
        # {'id': 'new_concept', 'name': '新概念英语', 'description': '经典英语教材', 'icon': '📖'},
        # {'id': 'oxford', 'name': '牛津英语', 'description': '牛津大学出版社教材', 'icon': '🎓'},
    ]
    return jsonify(textbooks)

@english_bp.route('/api/english/textbook/<textbook_id>/words')
@login_required
def get_words(textbook_id):
    """获取指定教材的单词列表"""
    username = session.get('user_id')
    
    # 根据教材ID加载单词数据
    if textbook_id == 'ket':
        json_file = 'english/vocabulary/ket.json'
    else:
        return jsonify({'error': '不支持的教材'}), 404
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        words_list = []
        for letter, words in data.items():
            for word_data in words:
                word_item = {
                    'word': word_data.get('word', ''),
                    'phonetic': word_data.get('phonetic', ''),
                    'part_of_speech': word_data.get('part_of_speech', ''),
                    'chinese': word_data.get('chinese', ''),
                    'example': word_data.get('example', ''),
                    'letter': letter,
                    'textbook': textbook_id
                }
                
                # 获取用户学习进度
                progress = WordProgress.query.filter_by(
                    user_id=username,
                    word=word_item['word'],
                    textbook=textbook_id
                ).first()
                
                if progress:
                    word_item['progress'] = {
                        'status': progress.status,
                        'review_count': progress.review_count,
                        'last_review': progress.last_review.isoformat() if progress.last_review else None
                    }
                else:
                    word_item['progress'] = {
                        'status': 'new',
                        'review_count': 0,
                        'last_review': None
                    }
                
                words_list.append(word_item)
        
        return jsonify({
            'total': len(words_list),
            'words': words_list
        })
    except FileNotFoundError:
        return jsonify({'error': '单词数据文件不存在'}), 404
    except Exception as e:
        return jsonify({'error': f'加载单词数据失败: {str(e)}'}), 500

@english_bp.route('/api/english/textbook/<textbook_id>/words/<letter>')
@login_required
def get_words_by_letter(textbook_id, letter):
    """按字母获取单词"""
    username = session.get('user_id')
    
    if textbook_id == 'ket':
        json_file = 'english/vocabulary/ket.json'
    else:
        return jsonify({'error': '不支持的教材'}), 404
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if letter.upper() not in data:
            return jsonify({'error': '字母不存在'}), 404
        
        words_list = []
        for word_data in data[letter.upper()]:
            word_item = {
                'word': word_data.get('word', ''),
                'phonetic': word_data.get('phonetic', ''),
                'part_of_speech': word_data.get('part_of_speech', ''),
                'chinese': word_data.get('chinese', ''),
                'example': word_data.get('example', ''),
                'letter': letter.upper(),
                'textbook': textbook_id
            }
            
            # 获取用户学习进度
            progress = WordProgress.query.filter_by(
                user_id=username,
                word=word_item['word'],
                textbook=textbook_id
            ).first()
            
            if progress:
                word_item['progress'] = {
                    'status': progress.status,
                    'review_count': progress.review_count,
                    'last_review': progress.last_review.isoformat() if progress.last_review else None
                }
            else:
                word_item['progress'] = {
                    'status': 'new',
                    'review_count': 0,
                    'last_review': None
                }
            
            words_list.append(word_item)
        
        return jsonify({
            'letter': letter.upper(),
            'total': len(words_list),
            'words': words_list
        })
    except FileNotFoundError:
        return jsonify({'error': '单词数据文件不存在'}), 404
    except Exception as e:
        return jsonify({'error': f'加载单词数据失败: {str(e)}'}), 500

@english_bp.route('/api/english/word/progress', methods=['POST'])
@login_required
def update_word_progress():
    """更新单词学习进度"""
    username = session.get('user_id')
    data = request.get_json()
    
    word = data.get('word')
    textbook = data.get('textbook')
    status = data.get('status', 'learning')  # new, learning, mastered, review
    
    if not word or not textbook:
        return jsonify({'error': '参数不完整'}), 400
    
    # 查找或创建进度记录
    progress = WordProgress.query.filter_by(
        user_id=username,
        word=word,
        textbook=textbook
    ).first()
    
    if not progress:
        progress = WordProgress(
            user_id=username,
            word=word,
            textbook=textbook,
            status=status,
            review_count=0  # 显式初始化
        )
        db.session.add(progress)
    else:
        progress.status = status
        progress.updated_at = datetime.utcnow()
        # 确保 review_count 不为 None（处理旧数据）
        if progress.review_count is None:
            progress.review_count = 0
    
    # 更新复习相关字段
    if status == 'mastered':
        if progress.review_count is None:
            progress.review_count = 0
        progress.review_count += 1
        progress.last_review = datetime.utcnow()
        # 设置下次复习时间（根据复习次数递增间隔）
        days = min(progress.review_count * 2, 30)  # 最多30天
        progress.next_review = datetime.utcnow() + timedelta(days=days)
    elif status == 'review':
        if progress.review_count is None:
            progress.review_count = 0
        progress.review_count += 1
        progress.last_review = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': '进度更新成功',
            'progress': {
                'status': progress.status,
                'review_count': progress.review_count
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新失败: {str(e)}'}), 500

@english_bp.route('/api/english/word/stats')
@login_required
def get_word_stats():
    """获取单词学习统计"""
    username = session.get('user_id')
    textbook = request.args.get('textbook', 'ket')
    
    total = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook
    ).count()
    
    new_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='new'
    ).count()
    
    learning_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='learning'
    ).count()
    
    mastered_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='mastered'
    ).count()
    
    review_count = WordProgress.query.filter_by(
        user_id=username,
        textbook=textbook,
        status='review'
    ).count()
    
    return jsonify({
        'total': total,
        'new': new_count,
        'learning': learning_count,
        'mastered': mastered_count,
        'review': review_count
    })

@english_bp.route('/api/english/word/speech', methods=['POST'])
@login_required
def generate_speech():
    """生成单词或句子的语音"""
    data = request.get_json()
    text = data.get('text', '').strip()
    voice = data.get('voice', current_app.config['TTS_VOICE'])
    speed = data.get('speed', 1.0)
    
    if not text:
        return jsonify({'error': '文本不能为空'}), 400
    
    # 清理文本：移除音标符号和特殊字符
    # 移除括号及其内容（词性描述等）
    text = re.sub(r'\([^)]*\)', '', text)
    # 移除 / 符号（用于音标标注和句子分隔）
    text = text.replace('/', ' ')
    # 移除多个连续空格
    text = re.sub(r'\s+', ' ', text)
    # 移除首尾空格
    text = text.strip()
    
    if not text:
        return jsonify({'error': '清理后的文本为空'}), 400
    
    # 记录请求信息（用于调试）
    print(f'TTS请求: 原始文本={data.get("text", "")[:50]}, 清理后={text[:50]}, voice={voice}, url={current_app.config["TTS_API_URL"]}')
    
    try:
        import time
        tts_start_time = time.time()
        
        # 调用本地TTS API
        response = requests.post(
            current_app.config['TTS_API_URL'],
            headers={
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {current_app.config['TTS_API_KEY']}"
            },
            json={
                'input': text,
                'voice': voice,
                'response_format': 'mp3',
                'speed': speed
            },
            timeout=10
        )
        
        tts_time = time.time() - tts_start_time
        print(f'[性能] TTS API调用耗时: {tts_time:.2f}秒')
        print(f'TTS响应状态码: {response.status_code}')
        
        if response.status_code == 200:
            # 检查响应内容类型
            content_type = response.headers.get('Content-Type', '')
            print(f'TTS响应Content-Type: {content_type}')
            
            # 返回音频数据
            return response.content, 200, {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': f'inline; filename="speech.mp3"',
                'Cache-Control': 'no-cache'
            }
        else:
            error_msg = f'TTS服务错误: {response.status_code}'
            try:
                error_detail = response.json() if response.text else '无详细信息'
            except:
                error_detail = response.text[:200] if response.text else '无详细信息'
            
            print(f'TTS错误: {error_msg}, 详情: {error_detail}')
            return jsonify({
                'error': error_msg,
                'details': error_detail,
                'status_code': response.status_code
            }), response.status_code
            
    except requests.exceptions.ConnectionError as e:
        error_msg = f'无法连接到TTS服务 ({current_app.config["TTS_API_URL"]})，请确保TTS服务正在运行'
        print(f'TTS连接错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'connection_error'}), 500
    except requests.exceptions.Timeout as e:
        error_msg = 'TTS服务响应超时，请稍后重试'
        print(f'TTS超时错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'timeout_error'}), 500
    except requests.exceptions.RequestException as e:
        error_msg = f'连接TTS服务失败: {str(e)}'
        print(f'TTS请求错误: {str(e)}')
        return jsonify({'error': error_msg, 'type': 'request_error'}), 500
    except Exception as e:
        error_msg = f'生成语音失败: {str(e)}'
        print(f'TTS未知错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg, 'type': 'unknown_error'}), 500

@english_bp.route('/api/english/voices')
@login_required
def get_voices():
    """获取可用的语音列表"""
    voices = [
        {'id': 'en-US-AnaNeural', 'name': 'Ana (Female)'},
        {'id': 'en-US-AndrewMultilingualNeural', 'name': 'Andrew Multilingual (Male)'},
        {'id': 'en-US-AndrewNeural', 'name': 'Andrew (Male)'},
        {'id': 'en-US-AriaNeural', 'name': 'Aria (Female)'},
        {'id': 'en-US-AvaMultilingualNeural', 'name': 'Ava Multilingual (Female)'},
        {'id': 'en-US-AvaNeural', 'name': 'Ava (Female)'},
        {'id': 'en-US-BrianMultilingualNeural', 'name': 'Brian Multilingual (Male)'},
        {'id': 'en-US-BrianNeural', 'name': 'Brian (Male)'},
        {'id': 'en-US-ChristopherNeural', 'name': 'Christopher (Male)'},
        {'id': 'en-US-EmmaMultilingualNeural', 'name': 'Emma Multilingual (Female)'},
        {'id': 'en-US-EmmaNeural', 'name': 'Emma (Female)'},
        {'id': 'en-US-EricNeural', 'name': 'Eric (Male)'},
        {'id': 'en-US-GuyNeural', 'name': 'Guy (Male)'},
        {'id': 'en-US-JennyNeural', 'name': 'Jenny (Female)'},
        {'id': 'en-US-MichelleNeural', 'name': 'Michelle (Female)'},
        {'id': 'en-US-RogerNeural', 'name': 'Roger (Male)'},
        {'id': 'en-US-SteffanNeural', 'name': 'Steffan (Male)'}
    ]
    return jsonify(voices)

# ==================== 错题相关路由 ====================

@english_bp.route('/api/english/wrong-answer', methods=['POST'])
@login_required
def save_wrong_answer():
    """保存错题"""
    username = session.get('user_id')
    data = request.get_json()
    
    word = data.get('word')
    phonetic = data.get('phonetic', '')
    chinese = data.get('chinese', '')
    textbook = data.get('textbook')
    practice_mode = data.get('practice_mode')  # chinese_to_english 或 english_to_chinese
    user_answer = data.get('user_answer', '')
    correct_answer = data.get('correct_answer', '')
    
    if not word or not textbook or not practice_mode or not correct_answer:
        return jsonify({'error': '参数不完整'}), 400
    
    try:
        # 查找是否已有该错题记录
        wrong_answer = WrongAnswer.query.filter_by(
            user_id=username,
            word=word,
            textbook=textbook,
            practice_mode=practice_mode
        ).first()
        
        if wrong_answer:
            # 更新错误次数和最近错误时间
            wrong_answer.error_count += 1
            wrong_answer.last_error_time = datetime.utcnow()
            wrong_answer.user_answer = user_answer
            wrong_answer.updated_at = datetime.utcnow()
        else:
            # 创建新的错题记录
            wrong_answer = WrongAnswer(
                user_id=username,
                word=word,
                phonetic=phonetic,
                chinese=chinese,
                textbook=textbook,
                practice_mode=practice_mode,
                user_answer=user_answer,
                correct_answer=correct_answer,
                error_count=1,
                last_error_time=datetime.utcnow()
            )
            db.session.add(wrong_answer)
        
        db.session.commit()
        return jsonify({
            'success': True,
            'message': '错题已保存',
            'error_count': wrong_answer.error_count
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'保存错题失败: {str(e)}')
        return jsonify({'error': f'保存错题失败: {str(e)}'}), 500

@english_bp.route('/api/english/wrong-answers')
@login_required
def get_wrong_answers():
    """获取用户的错题列表"""
    username = session.get('user_id')
    textbook = request.args.get('textbook', '')
    practice_mode = request.args.get('practice_mode', '')
    
    try:
        query = WrongAnswer.query.filter_by(user_id=username)
        
        if textbook:
            query = query.filter_by(textbook=textbook)
        if practice_mode:
            query = query.filter_by(practice_mode=practice_mode)
        
        # 按最近错误时间倒序排列
        wrong_answers = query.order_by(WrongAnswer.last_error_time.desc()).all()
        
        result = []
        for wa in wrong_answers:
            result.append({
                'id': wa.id,
                'word': wa.word,
                'phonetic': wa.phonetic,
                'chinese': wa.chinese,
                'textbook': wa.textbook,
                'practice_mode': wa.practice_mode,
                'user_answer': wa.user_answer,
                'correct_answer': wa.correct_answer,
                'error_count': wa.error_count,
                'last_error_time': wa.last_error_time.isoformat() if wa.last_error_time else None,
                'created_at': wa.created_at.isoformat() if wa.created_at else None
            })
        
        return jsonify({
            'total': len(result),
            'wrong_answers': result
        })
    except Exception as e:
        current_app.logger.error(f'获取错题列表失败: {str(e)}')
        return jsonify({'error': f'获取错题列表失败: {str(e)}'}), 500

@english_bp.route('/api/english/wrong-answer/<int:wrong_id>', methods=['DELETE'])
@login_required
def delete_wrong_answer(wrong_id):
    """删除错题"""
    username = session.get('user_id')
    
    try:
        wrong_answer = WrongAnswer.query.filter_by(
            id=wrong_id,
            user_id=username
        ).first()
        
        if not wrong_answer:
            return jsonify({'error': '错题不存在'}), 404
        
        db.session.delete(wrong_answer)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '错题已删除'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'删除错题失败: {str(e)}')
        return jsonify({'error': f'删除错题失败: {str(e)}'}), 500

# ==================== 口语练习相关路由 ====================

# 不同等级的prompt模板
SPEAKING_PROMPTS = {
    'beginner': {
        'name': '初级',
        'description': '适合初学者，使用简单词汇和短句',
        'system_prompt': '''You are a friendly English teacher helping a beginner student practice speaking English. 
IMPORTANT: You MUST respond ONLY in English, regardless of what language the student uses. This is an English speaking practice session.
Use simple words and short sentences (3-5 words). 
Keep the conversation topics simple: greetings, daily activities, family, food, colors, numbers.
Speak slowly and clearly. Use basic vocabulary only.
Respond in a warm and encouraging way. Keep each response to 1-2 short sentences.
If the student mentions a topic in Chinese or any other language, understand the topic and discuss it in English.

CRITICAL REQUIREMENT - YOU MUST ALWAYS INCLUDE CHINESE TRANSLATION:
After EVERY English response, you MUST add a Chinese translation in this EXACT format (no exceptions):
[TRANSLATION]中文翻译内容[/TRANSLATION]

The translation must be accurate and natural Chinese. This is mandatory for every response.

Example format:
Hello! How are you today?
[TRANSLATION]你好！你今天怎么样？[/TRANSLATION]

Remember: EVERY response must include the [TRANSLATION] tag with Chinese translation.''',
        'user_prompt_template': 'Generate a simple conversation topic and start with a question in English. The topic is: {topic}. If the topic is in Chinese, translate it to English first, then start the conversation about that topic in English.'
    },
    'elementary': {
        'name': '初级进阶',
        'description': '使用基础词汇和简单句型',
        'system_prompt': '''You are a patient English teacher helping an elementary student practice speaking English.
IMPORTANT: You MUST respond ONLY in English, regardless of what language the student uses. This is an English speaking practice session.
Use basic vocabulary and simple sentence structures (5-8 words).
Topics can include: hobbies, school, weather, shopping, transportation, time.
Use present tense mostly, with some simple past tense.
Be encouraging and provide gentle corrections if needed. Keep responses to 2-3 sentences.
If the student mentions a topic in Chinese or any other language, understand the topic and discuss it in English.

CRITICAL REQUIREMENT - YOU MUST ALWAYS INCLUDE CHINESE TRANSLATION:
After EVERY English response, you MUST add a Chinese translation in this EXACT format (no exceptions):
[TRANSLATION]中文翻译内容[/TRANSLATION]

The translation must be accurate and natural Chinese. This is mandatory for every response.

Example format:
I like playing basketball. What about you?
[TRANSLATION]我喜欢打篮球。你呢？[/TRANSLATION]

Remember: EVERY response must include the [TRANSLATION] tag with Chinese translation.''',
        'user_prompt_template': 'Generate a conversation starter in English for an elementary student. The topic is: {topic}. If the topic is in Chinese, translate it to English first, then start the conversation about that topic in English.'
    },
    'intermediate': {
        'name': '中级',
        'description': '使用中等难度词汇和复合句',
        'system_prompt': '''You are an experienced English teacher helping an intermediate student practice speaking English.
IMPORTANT: You MUST respond ONLY in English, regardless of what language the student uses. This is an English speaking practice session.
Use intermediate vocabulary and varied sentence structures (8-12 words).
Topics can include: travel, work, health, entertainment, technology, environment.
Use various tenses (present, past, future) and some conditional sentences.
Engage in more natural conversation. Responses can be 3-4 sentences.
If the student mentions a topic in Chinese or any other language, understand the topic and discuss it in English.

CRITICAL REQUIREMENT - YOU MUST ALWAYS INCLUDE CHINESE TRANSLATION:
After EVERY English response, you MUST add a Chinese translation in this EXACT format (no exceptions):
[TRANSLATION]中文翻译内容[/TRANSLATION]

The translation must be accurate and natural Chinese. This is mandatory for every response.

Example format:
I've been to Japan twice. The food there is amazing!
[TRANSLATION]我去过日本两次。那里的食物很棒！[/TRANSLATION]

Remember: EVERY response must include the [TRANSLATION] tag with Chinese translation.''',
        'user_prompt_template': 'Generate an engaging conversation topic in English for an intermediate student. The topic is: {topic}. If the topic is in Chinese, translate it to English first, then start the conversation about that topic in English.'
    },
    'advanced': {
        'name': '高级',
        'description': '使用高级词汇和复杂句型',
        'system_prompt': '''You are a professional English teacher helping an advanced student practice speaking English.
IMPORTANT: You MUST respond ONLY in English, regardless of what language the student uses. This is an English speaking practice session.
Use advanced vocabulary, idioms, and complex sentence structures (12+ words).
Topics can include: current events, philosophy, science, business, culture, abstract concepts.
Use all tenses, passive voice, subjunctive mood, and various sentence patterns.
Engage in sophisticated discussions. Responses can be 4-5 sentences.
If the student mentions a topic in Chinese or any other language, understand the topic and discuss it in English.

CRITICAL REQUIREMENT - YOU MUST ALWAYS INCLUDE CHINESE TRANSLATION:
After EVERY English response, you MUST add a Chinese translation in this EXACT format (no exceptions):
[TRANSLATION]中文翻译内容[/TRANSLATION]

The translation must be accurate and natural Chinese. This is mandatory for every response.

Example format:
The rapid advancement of artificial intelligence has profound implications for our society, raising both opportunities and ethical concerns.
[TRANSLATION]人工智能的快速发展对我们的社会产生了深远的影响，既带来了机遇，也引发了伦理担忧。[/TRANSLATION]

Remember: EVERY response must include the [TRANSLATION] tag with Chinese translation.''',
        'user_prompt_template': 'Generate a thought-provoking conversation topic in English for an advanced student. The topic is: {topic}. If the topic is in Chinese, translate it to English first, then start the conversation about that topic in English.'
    }
}

@english_bp.route('/english/speaking')
@login_required
def speaking_page():
    """口语练习页面"""
    return render_template('speaking.html')

@english_bp.route('/api/english/speaking/levels')
@login_required
def get_speaking_levels():
    """获取口语练习等级列表"""
    levels = []
    for level_id, level_info in SPEAKING_PROMPTS.items():
        levels.append({
            'id': level_id,
            'name': level_info['name'],
            'description': level_info['description']
        })
    return jsonify(levels)

@english_bp.route('/api/english/speaking/generate', methods=['POST'])
@login_required
def generate_conversation():
    """生成对话内容"""
    data = request.get_json()
    level = data.get('level', 'beginner')
    topic = data.get('topic', '')
    conversation_history = data.get('history', [])  # 对话历史
    
    if level not in SPEAKING_PROMPTS:
        return jsonify({'error': '无效的等级'}), 400
    
    level_config = SPEAKING_PROMPTS[level]
    
    # 构建消息列表
    messages = [
        {'role': 'system', 'content': level_config['system_prompt']}
    ]
    
    # 添加对话历史
    # 注意：对话历史中的assistant回复应该只包含英文（不包含翻译标记）
    # 因为前端存储的是清理后的英文内容
    for item in conversation_history[-5:]:  # 只保留最近5轮对话
        if item.get('role') == 'user':
            messages.append({'role': 'user', 'content': item.get('content', '')})
        elif item.get('role') == 'assistant':
            # 确保assistant回复只包含英文（清理可能的翻译标记）
            assistant_content = item.get('content', '')
            import re
            translation_pattern = r'\[TRANSLATION\](.*?)\[/TRANSLATION\]'
            # 如果历史中有翻译标记，移除它
            assistant_content = re.sub(translation_pattern, '', assistant_content, flags=re.DOTALL).strip()
            messages.append({'role': 'assistant', 'content': assistant_content})
    
    # 如果是新对话，生成初始话题
    if not conversation_history:
        # 处理话题：如果是中文，需要明确说明这是英文口语练习
        topic_text = topic.strip() if topic else 'daily life'
        # 检查是否包含中文字符
        has_chinese = any('\u4e00' <= char <= '\u9fff' for char in topic_text)
        
        if has_chinese:
            # 如果话题是中文，在prompt中明确说明要用英文讨论这个中文话题
            user_prompt = f'''The student wants to practice English speaking about the topic: "{topic_text}" (this is in Chinese). 
Please translate this topic to English and start a conversation in English about this topic. 
Remember: This is an English speaking practice, so you must respond ONLY in English.

REMINDER: You MUST include Chinese translation in [TRANSLATION]...[/TRANSLATION] format after your English response.'''
        else:
            # 英文话题，也要提醒翻译要求
            user_prompt = f'''{level_config['user_prompt_template'].format(topic=topic_text)}

REMINDER: You MUST include Chinese translation in [TRANSLATION]...[/TRANSLATION] format after your English response.'''
    else:
        # 继续对话
        user_input = data.get('user_input', 'Continue the conversation naturally.')
        # 检查用户输入是否包含中文
        has_chinese = any('\u4e00' <= char <= '\u9fff' for char in user_input)
        
        if has_chinese:
            # 如果用户输入包含中文，提示AI用英文回复
            user_prompt = f'''The student said: "{user_input}" (this may contain Chinese). 
Please understand what they mean and respond in English. This is an English speaking practice session, so you must respond ONLY in English.

REMINDER: You MUST include Chinese translation in [TRANSLATION]...[/TRANSLATION] format after your English response.'''
        else:
            # 即使没有中文，也要提醒翻译要求
            user_prompt = f'''{user_input}

REMINDER: You MUST include Chinese translation in [TRANSLATION]...[/TRANSLATION] format after your English response.'''
    
    messages.append({'role': 'user', 'content': user_prompt})
    
    try:
        import time
        start_time = time.time()
        
        # 调用DeepSeek API
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
                'max_tokens': 400,  # 增加token数量以支持中文翻译（英文+中文）
                'stream': False  # 不使用流式输出
            },
            timeout=current_app.config.get('AI_TIMEOUT', 30)
        )
        
        ai_api_time = time.time() - start_time
        print(f'[性能] AI API调用耗时: {ai_api_time:.2f}秒')
        
        if response.status_code == 200:
            result = response.json()
            assistant_message = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            
            # 解析英文和中文翻译
            import re
            translation_pattern = r'\[TRANSLATION\](.*?)\[/TRANSLATION\]'
            translation_match = re.search(translation_pattern, assistant_message, re.DOTALL)
            
            english_text = assistant_message
            chinese_translation = ''
            
            if translation_match:
                # 提取中文翻译
                chinese_translation = translation_match.group(1).strip()
                # 移除翻译标记，只保留英文
                english_text = re.sub(translation_pattern, '', assistant_message, flags=re.DOTALL).strip()
                print(f'[成功] 解析到翻译: {chinese_translation[:50]}...')
            else:
                # 如果没有找到翻译标记，记录警告
                print(f'[警告] AI回复中未找到翻译标记')
                print(f'[调试] AI回复内容（前200字符）: {assistant_message[:200]}')
                # 如果回复包含中文字符，可能是翻译但没有标记
                if any('\u4e00' <= char <= '\u9fff' for char in assistant_message):
                    print('[提示] 检测到中文字符，但未找到翻译标记格式，可能需要调整prompt')
            
            return jsonify({
                'success': True,
                'message': english_text,
                'translation': chinese_translation,
                'level': level
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
        error_msg = f'生成对话失败: {str(e)}'
        print(f'AI未知错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg, 'type': 'unknown_error'}), 500

@english_bp.route('/api/english/speaking/recognize', methods=['POST'])
@login_required
def recognize_speech():
    """使用Whisper本地进行语音识别"""
    if 'audio' not in request.files:
        return jsonify({'error': '未找到音频文件'}), 400
    
    audio_file = request.files['audio']
    language = request.form.get('language', current_app.config.get('WHISPER_LANGUAGE', 'en'))
    
    if audio_file.filename == '':
        return jsonify({'error': '音频文件为空'}), 400
    
    # 获取Whisper配置
    whisper_model = current_app.config.get('WHISPER_MODEL', 'base')
    # 将语言代码转换为Whisper支持的语言代码，如果不在支持列表中则设为None（自动检测）
    # Whisper支持的语言代码：https://github.com/openai/whisper/blob/main/whisper/tokenizer.py
    supported_languages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ar', 'hi', 'th', 'vi', 'tr', 'pl', 'nl', 'cs', 'sv', 'ro', 'hu', 'fi', 'da', 'no', 'el', 'he', 'uk', 'id', 'ms', 'sk', 'hr', 'bg', 'sr', 'sl', 'et', 'lv', 'lt', 'mt', 'ga', 'cy', 'is', 'mk', 'sq', 'be', 'bs', 'ca', 'eu', 'gl', 'lb']
    whisper_language = language if language in supported_languages else None
    whisper_task = current_app.config.get('WHISPER_TASK', 'transcribe')
    
    try:
        # 准备音频数据
        audio_data = audio_file.read()
        filename = audio_file.filename or 'recording.wav'
        
        print(f'Whisper识别请求: 模型={whisper_model}, 语言={whisper_language}, 任务={whisper_task}, 文件={filename}, 大小={len(audio_data)} bytes')
        
        # 调用Whisper识别函数
        recognized_text = recognize_speech_whisper(
            audio_data=audio_data,
            filename=filename,
            model_name=whisper_model,
            language=whisper_language,
            task=whisper_task
        )
        
        if not recognized_text:
            return jsonify({
                'error': '未能识别到语音内容',
                'type': 'empty_result'
            }), 400
        
        print(f'识别结果: {recognized_text}')
        
        return jsonify({
            'success': True,
            'text': recognized_text
        })
            
    except Exception as e:
        error_msg = f'语音识别失败: {str(e)}'
        print(f'Whisper错误: {error_msg}')
        import traceback
        traceback.print_exc()
        
        # 判断错误类型
        if 'model' in str(e).lower() or '加载' in str(e):
            error_type = 'model_error'
            error_msg = f'Whisper模型加载失败: {str(e)}'
        elif 'memory' in str(e).lower() or '内存' in str(e):
            error_type = 'memory_error'
            error_msg = '内存不足，请尝试使用更小的模型（如 tiny 或 base）'
        else:
            error_type = 'unknown_error'
        
        return jsonify({
            'error': error_msg,
            'type': error_type
        }), 500

# ==================== 数学口算练习相关路由 ====================
