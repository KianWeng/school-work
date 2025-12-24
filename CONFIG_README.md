# 配置文件说明

## 配置文件

应用支持通过配置文件管理所有设置。配置文件位于项目根目录：

- `config.py` - 实际使用的配置文件（需要创建）
- `config.example.py` - 配置文件示例（已提供）

## 快速开始

### 1. 创建配置文件

```bash
cp config.example.py config.py
```

### 2. 编辑配置文件

打开 `config.py`，根据你的需求修改配置项。

## 配置项说明

### Flask 基础配置

- `SECRET_KEY`: 会话密钥，用于加密会话数据
  - 生产环境请使用强随机密钥
  - 可以通过环境变量 `SECRET_KEY` 设置

### 数据库配置

- `SQLALCHEMY_DATABASE_URI`: 数据库连接字符串
  - 默认: `sqlite:///users.db`
  - 可以通过环境变量 `DATABASE_URL` 设置

### 服务器配置

- `HOST`: 服务器监听地址
  - 默认: `0.0.0.0` (监听所有网络接口)
  - 可以通过环境变量 `HOST` 设置

- `PORT`: 服务器端口
  - 默认: `50000`
  - 可以通过环境变量 `PORT` 设置

- `DEBUG`: 调试模式
  - 默认: `True`
  - 生产环境请设置为 `False`
  - 可以通过环境变量 `DEBUG` 设置

### TTS 语音服务配置

- `TTS_API_URL`: TTS API 地址
  - 默认: `http://localhost:5050/v1/audio/speech`
  - 可以通过环境变量 `TTS_API_URL` 设置

- `TTS_API_KEY`: TTS API 密钥
  - 默认: `your_api_key_here`
  - 可以通过环境变量 `TTS_API_KEY` 设置

- `TTS_VOICE`: 默认语音
  - 默认: `en-US-JennyNeural`
  - 可选值见 `TTS_CONFIG.md`
  - 可以通过环境变量 `TTS_VOICE` 设置

- `TTS_SPEED`: 默认语速
  - 默认: `1.0`
  - 范围: 0.5 - 2.0
  - 可以通过环境变量 `TTS_SPEED` 设置

### 文件路径配置

- `WORD_DATA_DIR`: 单词数据文件目录
  - 默认: `english`

- `KET_WORD_FILE`: KET 单词文件路径
  - 默认: `english/ket_A.json`

- `OUTPUT_DIR`: 输出文件目录
  - 默认: `out`

### 学习相关配置

- `REVIEW_INTERVAL_DAYS`: 复习间隔（天）
  - 默认: `2`

- `MAX_REVIEW_INTERVAL`: 最大复习间隔（天）
  - 默认: `30`

- `WORDS_PER_PAGE`: 每页单词数
  - 默认: `20`

## 环境变量配置

所有配置项都可以通过环境变量覆盖。优先级：环境变量 > 配置文件 > 默认值

### 示例

```bash
# 设置 TTS API 地址
export TTS_API_URL="http://192.168.1.100:5050/v1/audio/speech"

# 设置 API 密钥
export TTS_API_KEY="your_actual_api_key"

# 设置端口
export PORT=8080

# 启动应用
python app.py
```

## 配置环境

应用支持不同的配置环境：

- `development`: 开发环境（默认）
- `production`: 生产环境
- `testing`: 测试环境

通过环境变量 `FLASK_ENV` 设置：

```bash
export FLASK_ENV=production
python app.py
```

## 配置验证

配置文件包含验证方法，启动时会检查配置的有效性：

```python
from config import Config
errors = Config.validate()
if errors:
    print("配置错误:", errors)
```

## 注意事项

1. **生产环境**：
   - 设置强随机 `SECRET_KEY`
   - 设置 `DEBUG = False`
   - 使用环境变量管理敏感信息（如 API 密钥）

2. **安全建议**：
   - 不要将包含真实密钥的 `config.py` 提交到版本控制
   - 使用 `.gitignore` 忽略 `config.py`
   - 使用环境变量或密钥管理服务存储敏感信息

3. **配置文件优先级**：
   - 如果存在 `config.py`，会优先使用
   - 如果不存在，会使用默认配置并显示警告

