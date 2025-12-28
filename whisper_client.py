# -*- encoding: utf-8 -*-
"""
Whisper 本地语音识别客户端
使用 OpenAI Whisper 进行本地语音识别
"""

import whisper
import tempfile
import os
from io import BytesIO


# 全局模型缓存，避免重复加载
_whisper_model_cache = {}


def load_whisper_model(model_name='base'):
    """
    加载 Whisper 模型（带缓存）
    
    参数:
        model_name: 模型名称，可选 'tiny', 'base', 'small', 'medium', 'large'
    
    返回:
        Whisper 模型对象
    """
    if model_name not in _whisper_model_cache:
        print(f'正在加载 Whisper 模型: {model_name}...')
        try:
            _whisper_model_cache[model_name] = whisper.load_model(model_name)
            print(f'✓ Whisper 模型 {model_name} 加载成功')
        except Exception as e:
            print(f'✗ 加载 Whisper 模型失败: {str(e)}')
            raise Exception(f'无法加载 Whisper 模型 {model_name}: {str(e)}')
    
    return _whisper_model_cache[model_name]


def recognize_speech_whisper(audio_data, filename, model_name='base', language=None, task='transcribe'):
    """
    使用 Whisper 进行语音识别
    
    参数:
        audio_data: 音频文件原始数据（bytes）
        filename: 文件名
        model_name: Whisper 模型名称（默认 'base'）
        language: 识别语言代码（如 'en', 'zh'），None 表示自动检测
        task: 任务类型，'transcribe'（转录）或 'translate'（翻译为英文）
    
    返回:
        识别出的文本（str）
    """
    try:
        # 加载模型
        model = load_whisper_model(model_name)
        
        # 将音频数据保存到临时文件
        # Whisper 需要文件路径或 numpy 数组
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name
        
        try:
            # 执行识别
            print(f'开始 Whisper 识别: 模型={model_name}, 语言={language}, 任务={task}')
            result = model.transcribe(
                tmp_file_path,
                language=language,
                task=task,
                verbose=False  # 不打印详细日志
            )
            
            # 提取识别文本
            recognized_text = result.get('text', '').strip()
            
            print(f'识别结果: {recognized_text}')
            
            return recognized_text
            
        finally:
            # 清理临时文件
            try:
                os.unlink(tmp_file_path)
            except Exception as e:
                print(f'清理临时文件失败: {str(e)}')
                
    except Exception as e:
        error_msg = f'Whisper 识别失败: {str(e)}'
        print(error_msg)
        raise Exception(error_msg)


def recognize_speech_from_bytes(audio_bytes, sample_rate=16000, model_name='base', language=None, task='transcribe'):
    """
    从 PCM 字节数据识别语音（需要先转换为 WAV 格式）
    
    参数:
        audio_bytes: PCM 音频字节数据
        sample_rate: 采样率（默认 16000 Hz）
        model_name: Whisper 模型名称
        language: 识别语言代码
        task: 任务类型
    
    返回:
        识别出的文本（str）
    """
    import wave
    import numpy as np
    
    try:
        # 将 PCM 数据转换为 numpy 数组
        # 假设是 16-bit PCM
        audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
        # 加载模型
        model = load_whisper_model(model_name)
        
        # 执行识别（Whisper 可以直接接受 numpy 数组）
        print(f'开始 Whisper 识别: 模型={model_name}, 语言={language}, 任务={task}, 采样率={sample_rate}')
        result = model.transcribe(
            audio_array,
            language=language,
            task=task,
            verbose=False
        )
        
        # 提取识别文本
        recognized_text = result.get('text', '').strip()
        
        print(f'识别结果: {recognized_text}')
        
        return recognized_text
        
    except Exception as e:
        error_msg = f'Whisper 识别失败: {str(e)}'
        print(error_msg)
        raise Exception(error_msg)

