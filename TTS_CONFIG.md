# TTS 语音服务配置说明

## 配置方法

### 方法1：环境变量（推荐）

在启动应用前设置环境变量：

```bash
export TTS_API_URL="http://localhost:5050/v1/audio/speech"
export TTS_API_KEY="your_api_key_here"
export TTS_VOICE="en-US-JennyNeural"

python app.py
```

### 方法2：修改代码配置

在 `app.py` 中修改默认配置：

```python
app.config['TTS_API_URL'] = 'http://localhost:5050/v1/audio/speech'
app.config['TTS_API_KEY'] = 'your_api_key_here'
app.config['TTS_VOICE'] = 'en-US-JennyNeural'
```

## 可用语音列表

- `en-US-AnaNeural` - Ana (Female)
- `en-US-AndrewMultilingualNeural` - Andrew Multilingual (Male)
- `en-US-AndrewNeural` - Andrew (Male)
- `en-US-AriaNeural` - Aria (Female)
- `en-US-AvaMultilingualNeural` - Ava Multilingual (Female)
- `en-US-AvaNeural` - Ava (Female)
- `en-US-BrianMultilingualNeural` - Brian Multilingual (Male)
- `en-US-BrianNeural` - Brian (Male)
- `en-US-ChristopherNeural` - Christopher (Male)
- `en-US-EmmaMultilingualNeural` - Emma Multilingual (Female)
- `en-US-EmmaNeural` - Emma (Female)
- `en-US-EricNeural` - Eric (Male)
- `en-US-GuyNeural` - Guy (Male)
- `en-US-JennyNeural` - Jenny (Female) - 默认
- `en-US-MichelleNeural` - Michelle (Female)
- `en-US-RogerNeural` - Roger (Male)
- `en-US-SteffanNeural` - Steffan (Male)

## 测试TTS服务

使用 curl 测试 TTS 服务是否正常工作：

```bash
curl -X POST http://localhost:5050/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key_here" \
  -d '{
    "input": "Hello, I am your AI assistant!",
    "voice": "en-US-JennyNeural",
    "response_format": "mp3",
    "speed": 1.1
  }' \
  --output speech.mp3
```

如果成功，应该会生成 `speech.mp3` 文件。

## 常见问题

### 1. 连接错误
- 确保 TTS 服务运行在 `http://localhost:5050`
- 检查防火墙设置
- 验证服务是否正常启动

### 2. 认证错误
- 检查 API 密钥是否正确
- 确认 Authorization header 格式正确

### 3. 音频播放失败
- 检查浏览器控制台的错误信息
- 确认浏览器支持 MP3 格式
- 检查浏览器音频权限设置

## 调试

应用会在控制台输出详细的调试信息：
- TTS 请求参数
- TTS 响应状态码
- 错误详情

查看浏览器控制台（F12）和 Flask 应用日志以获取更多信息。

