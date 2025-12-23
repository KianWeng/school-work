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

## 运行应用

```bash
python app.py
```

然后在浏览器中访问：http://localhost:50000

## 项目结构

```
.
├── app.py                 # Flask 后端应用
├── templates/
│   └── index.html        # 前端主页面
├── static/
│   ├── css/
│   │   └── style.css    # 样式文件
│   └── js/
│       └── main.js      # JavaScript 交互逻辑
└── requirements.txt      # Python 依赖
```

## API 接口

- `GET /` - 首页
- `GET /api/subjects` - 获取所有学科列表
- `GET /api/subject/<subject_id>` - 获取指定学科详情
- `GET /api/subject/<subject_id>/modules` - 获取指定学科的模块列表

