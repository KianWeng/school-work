# 小学生学习平台

一个基于 Flask 和 JavaScript 的小学生学习 Web 应用。

## 功能特点

- 📚 语文学习
- 🔢 数学练习
- 🔤 英语学习
- 🔬 科学探索

## 安装依赖

```bash
pip install -r requirements.txt
```

## 初始化数据库

首次运行前，需要初始化数据库：

```bash
python init_db.py
```

这会创建数据库文件 `users.db` 和默认用户账户（用户名：student，密码：student）。

## 运行应用

```bash
python app.py
```

然后在浏览器中访问：http://localhost:50000

注意：应用启动时会自动检查并创建数据库表，如果数据库不存在会自动创建。

## 项目结构

```
.
├── app.py                 # Flask 后端应用
├── init_db.py            # 数据库初始化脚本
├── users.db              # SQLite 数据库文件（自动生成）
├── templates/
│   ├── index.html        # 前端主页面
│   ├── login.html        # 登录页面
│   └── register.html     # 注册页面
├── static/
│   ├── css/
│   │   ├── style.css     # 主页面样式
│   │   └── login.css     # 登录/注册页面样式
│   └── js/
│       ├── main.js       # 主页面交互逻辑
│       ├── login.js       # 登录页面逻辑
│       └── register.js   # 注册页面逻辑
└── requirements.txt      # Python 依赖
```

## API 接口

### 认证相关
- `GET /login` - 登录页面
- `POST /login` - 用户登录
- `GET /register` - 注册页面
- `POST /register` - 用户注册
- `POST /api/logout` - 用户登出
- `GET /api/user/info` - 获取当前用户信息

### 学科相关
- `GET /` - 首页（需要登录）
- `GET /api/subjects` - 获取所有学科列表（需要登录）
- `GET /api/subject/<subject_id>` - 获取指定学科详情（需要登录）
- `GET /api/subject/<subject_id>/modules` - 获取指定学科的模块列表（需要登录）

## 数据库

应用使用 SQLite 数据库存储用户信息。数据库文件为 `users.db`。

### 用户表结构
- `id`: 主键
- `username`: 用户名（唯一）
- `password_hash`: 密码哈希值
- `name`: 用户姓名
- `created_at`: 创建时间

### 默认账户
- 用户名：`student`
- 密码：`student`

