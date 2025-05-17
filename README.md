# 简易聊天室应用

这是一个基于Web的实时聊天室应用，支持用户登录、文字聊天、图片分享和个人资料管理等功能。

## 项目特点

- 🚀 **无需注册**：直接输入用户名即可开始聊天
- 💬 **实时消息**：基于WebSocket的即时通讯
- 🖼️ **图片分享**：支持发送和接收图片
- 🔄 **响应式设计**：适配移动端和桌面端
- 🌐 **公网访问**：支持通过互联网访问

## 应用部署

### 本地部署

```bash
# 克隆仓库
git clone https://github.com/username/webserver-chatroom.git

# 进入项目目录
cd webserver-chatroom

# 安装依赖
npm install

# 启动服务器
npm start
```

### Docker部署

```bash
# 构建Docker镜像
docker build -t chatroom .

# 运行容器
docker run -d --name chatroom-app -p 9091:9091 chatroom
```

## 项目结构

```
├── public/                # 静态资源文件
│   ├── css/               # CSS样式文件
│   │   ├── chat.css       # 聊天页面样式
│   │   └── profile.css    # 个人空间页面样式
│   ├── js/                # JavaScript文件
│   │   ├── chat.js        # 聊天页面脚本
│   │   └── profile.js     # 个人空间页面脚本
│   ├── images/            # 图片资源
│   ├── uploads/           # 上传文件目录
│   ├── chat.html          # 聊天页面
│   └── profile.html       # 个人空间页面
├── server/                # 服务器端代码
│   └── server.js          # 主服务器文件
├── Dockerfile             # Docker配置文件
├── package.json           # 项目配置和依赖
└── README.md              # 项目说明文档
```

## 功能说明

### 聊天功能

- **文字聊天**：发送和接收实时文本消息
- **图片分享**：支持上传和显示图片
- **在线状态**：显示当前在线用户数量
- **消息通知**：用户加入/离开提醒

### 个人资料页面 (profile.html)

- **用户资料展示**：显示用户名、签名等信息
- **资料编辑**：修改个人资料和头像颜色
- **统计信息**：显示消息数、在线时长等数据

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **后端**：Node.js, WebSocket (ws库)
- **部署**：Docker

## 访问地址

- **本地访问**：http://localhost:9091
- **公网访问**：http://ip:9091

## 已知问题

1. 刷新界面会自动登录上次使用的用户
2. 在某些移动浏览器上可能存在兼容性问题

## 未来计划

- [ ] 添加聊天记录持久化
- [ ] 实现私聊功能
- [ ] 添加表情包支持
- [ ] 优化移动端体验
