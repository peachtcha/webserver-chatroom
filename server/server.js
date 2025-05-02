const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const url = require('url');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  console.log(`收到请求: ${req.url}`);
  
  // 解析URL和查询参数
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><body><h1>聊天室服务器</h1><p><a href="/chat.html">进入聊天室</a></p></body></html>');
    return;
  }

  // API接口处理
  if (pathname === '/api/user/profile') {
    // 处理获取用户资料的请求
    if (req.method === 'GET') {
      // 从 cookie 或 查询参数中获取用户名
      let username = '';
      
      if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        const usernameCookie = cookies.find(cookie => cookie.trim().startsWith('username='));
        if (usernameCookie) {
          username = decodeURIComponent(usernameCookie.split('=')[1]);
        }
      }
      
      if (!username && parsedUrl.query.username) {
        username = parsedUrl.query.username;
      }
      
      if (!username) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '未登录或未提供用户名' }));
        return;
      }
      
      // 获取用户资料，如果不存在则创建默认资料
      let profile = userProfiles.get(username);
      if (!profile) {
        profile = {
          username: username,
          signature: '',
          avatarColor: Math.floor(Math.random() * 5) + 1,
          messageCount: 0,
          friendCount: 0,
          groupCount: 0
        };
        userProfiles.set(username, profile);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(profile));
      return;
    }
    
    // 处理更新用户资料的请求
    if (req.method === 'POST') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const username = data.username;
          
          if (!username) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '用户名不能为空' }));
            return;
          }
          
          // 获取或创建用户资料
          let profile = userProfiles.get(username);
          if (!profile) {
            profile = {
              username: username,
              signature: '',
              avatarColor: 1,
              messageCount: 0,
              friendCount: 0,
              groupCount: 0
            };
          }
          
          // 更新用户资料
          profile.signature = data.signature || '';
          profile.avatarColor = data.avatarColor || profile.avatarColor;
          
          // 保存更新后的资料
          userProfiles.set(username, profile);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(profile));
        } catch (error) {
          console.error('解析请求数据出错:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '请求数据格式错误' }));
        }
      });
      
      return;
    }
    
    // 不支持的HTTP方法
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '不支持的HTTP方法' }));
    return;
  }
  
  // 尝试提供静态文件，忽略WebSocket请求
  if (req.url === '/ws') {
    // WebSocket请求会被WebSocket服务器处理
    return;
  }
  
  // 提供静态文件
  const filePath = path.join(__dirname, '../public', pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`文件读取错误: ${err}`);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    
    // 根据文件扩展名设置Content-Type
    const ext = path.extname(filePath);
    let contentType = 'text/plain; charset=utf-8';
    
    if (ext === '.html') {
      contentType = 'text/html; charset=utf-8';
    } else if (ext === '.css') {
      contentType = 'text/css; charset=utf-8';
    } else if (ext === '.js') {
      contentType = 'application/javascript; charset=utf-8';
    } else if (ext === '.json') {
      contentType = 'application/json; charset=utf-8';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.ico') {
      contentType = 'image/x-icon';
    } else if (ext === '.mp3') {
      contentType = 'audio/mpeg';
    } else if (ext === '.wav') {
      contentType = 'audio/wav';
    } else if (ext === '.ogg') {
      contentType = 'audio/ogg';
    } else if (ext === '.webm') {
      contentType = 'audio/webm';
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 保存所有连接的客户端
const clients = new Map();

// 保存最近的消息历史记录，最多保存50条
const messageHistory = [];
const MAX_HISTORY = 50;

// 正在输入状态的用户
const typingUsers = new Set();

// 创建上传目录（如果不存在）
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 创建用于存储图片的目录
const imageUploadDir = path.join(uploadDir, 'images');
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

// 创建用于存储语音的目录
const voiceUploadDir = path.join(uploadDir, 'voices');
if (!fs.existsSync(voiceUploadDir)) {
  fs.mkdirSync(voiceUploadDir, { recursive: true });
}

// 用户资料存储
const userProfiles = new Map();

// 添加消息到历史记录
function addToHistory(message) {
  messageHistory.push(message);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift(); // 删除最旧的消息
  }
}

// 保存Base64数据为文件
function saveBase64File(base64Data, folder, extension) {
  console.log('接收到的数据类型:', typeof base64Data);
  
  if (!base64Data) {
    throw new Error('Base64数据为空');
  }
  
  let buffer;
  let dataType = '';
  
  // 输出前50个字符用于调试，避免日志过大
  const dataSample = typeof base64Data === 'string' ? base64Data.substring(0, 50) + '...' : 'non-string data';
  console.log('数据样本:', dataSample);
  
  try {
    // 1. 检查是否是标准的data URI格式（data:mime/type;base64,DATA）
    if (typeof base64Data === 'string' && base64Data.startsWith('data:')) {
      // 使用更灵活的正则表达式来捕获复杂MIME类型
      const baseRegex = /^data:([^;,]+).*?;base64,(.+)$/;
      let matches = base64Data.match(baseRegex);
      
      if (matches && matches.length >= 3) {
        dataType = matches[1]; // 只捕获主MIME类型
        const base64Content = matches[2];
        console.log('解析成功，MIME类型:', dataType, '数据长度:', base64Content.length);
        
        try {
          buffer = Buffer.from(base64Content, 'base64');
        } catch (bufferError) {
          console.error('创建Buffer错误:', bufferError);
          throw new Error(`无法从Base64创建Buffer: ${bufferError.message}`);
        }
      } else {
        // 如果无法匹配，尝试手动提取
        console.log('无法用正则表达式匹配，尝试手动提取');
        const base64Index = base64Data.indexOf(';base64,');
  
        if (base64Index !== -1) {
          const base64Content = base64Data.substring(base64Index + 8); // 8 是 ';base64,' 的长度
          const mimeEndIndex = base64Data.indexOf(';');
          dataType = mimeEndIndex !== -1 ? base64Data.substring(5, mimeEndIndex) : 'unknown';
          
          console.log('手动提取成功，MIME类型:', dataType, '数据长度:', base64Content.length);
          
          try {
            buffer = Buffer.from(base64Content, 'base64');
          } catch (bufferError) {
            console.error('创建Buffer错误:', bufferError);
            throw new Error(`无法从Base64创建Buffer: ${bufferError.message}`);
          }
        } else {
          console.error('无法解析data URI格式，格式不正确');
          console.log('URI前缀:', base64Data.substring(0, 30));
          throw new Error('无效的data URI格式');
        }
      }
    } 
    // 2. 检查是否只有Base64部分（没有data URI前缀）
    else if (typeof base64Data === 'string') {
      // 尝试确定contentType
      if (extension === '.webm') {
        dataType = 'audio/webm';
      } else if (extension === '.jpg') {
        dataType = 'image/jpeg';
      } else if (extension === '.mp3') {
        dataType = 'audio/mpeg';
      } else if (extension === '.ogg') {
        dataType = 'audio/ogg';
      } else {
        dataType = 'application/octet-stream';
      }
      
      console.log('非标准格式，假定MIME类型:', dataType, '数据长度:', base64Data.length);
      
      // 检查是否是有效的Base64
      const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      if (!base64Regex.test(base64Data)) {
        console.error('提供的数据不符合Base64编码规则');
        // 尝试自动修复：移除可能的非Base64字符
        const cleanedBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
        console.log('尝试清理后的数据长度:', cleanedBase64.length);
        
        if (base64Regex.test(cleanedBase64)) {
          console.log('清理后的数据符合Base64格式');
          try {
            buffer = Buffer.from(cleanedBase64, 'base64');
          } catch (bufferError) {
            console.error('创建Buffer错误:', bufferError);
            throw new Error('即使清理后的数据也无法解码为有效的Buffer');
          }
        } else {
          throw new Error('提供的数据不是有效的Base64编码');
        }
      } else {
        // 尝试直接解码Base64部分
        try {
          buffer = Buffer.from(base64Data, 'base64');
        } catch (bufferError) {
          console.error('创建Buffer错误:', bufferError);
          throw new Error(`无法从Base64创建Buffer: ${bufferError.message}`);
        }
      }
    } else {
      throw new Error(`数据类型不是字符串，而是 ${typeof base64Data}`);
    }
    
    if (!buffer || buffer.length === 0) {
      throw new Error('转换后的Buffer为空');
  }
    
    console.log('转换后的Buffer长度:', buffer.length);
  
  const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}${extension}`;
  const filepath = path.join(folder, filename);
    
    // 确保文件夹存在
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  
  fs.writeFileSync(filepath, buffer);
    console.log('文件已保存到:', filepath);
  
  return `/uploads/${path.basename(folder)}/${filename}`;
  } catch (error) {
    console.error('Base64处理错误:', error);
    throw new Error(`Base64转换错误: ${error.message}`);
  }
}

// 处理WebSocket连接
wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  
  // 生成唯一ID
  const clientId = Date.now() + Math.floor(Math.random() * 1000);
  let username = '游客' + clientId;
  let avatarType = Math.floor(Math.random() * 5) + 1; // 默认随机头像类型
  
  // 保存连接
  clients.set(clientId, {
    ws,
    username,
    avatarType,
    joinTime: Date.now()
  });
  
  // 发送系统消息
  const connectMessage = {
    type: 'system',
    content: `服务器已连接`,
    timestamp: Math.floor(Date.now() / 1000)
  };
  ws.send(JSON.stringify(connectMessage));
  
  // 发送用户数量更新
  broadcastUserCount();
  
  // 发送历史消息
  sendMessageHistory(ws);
  
  // 处理消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('收到消息类型:', data.type);
      
      // 处理登录消息
      if (data.type === 'join') {
        username = data.username || username;
        // 从消息中获取头像类型，如果没有则根据用户名生成一个固定的类型
        avatarType = data.avatarType || (Math.abs(username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 5) + 1;
        
        console.log(`用户 ${username} 的头像类型: ${avatarType}`);
        
        clients.get(clientId).username = username;
        clients.get(clientId).avatarType = avatarType;
        
        // 向所有客户端广播登录消息
        const loginMessage = {
          type: 'system',
          content: `${username} 加入了聊天室，当前在线 ${clients.size} 人`,
          timestamp: Math.floor(Date.now() / 1000)
        };
        broadcastMessage(loginMessage);
        addToHistory(loginMessage);
        
        // 更新用户数量
        broadcastUserCount();
        
        // 创建或获取用户资料
        if (!userProfiles.has(username)) {
          userProfiles.set(username, {
            username: username,
            signature: '',
            avatarColor: avatarType || 1,
            messageCount: 0,
            friendCount: 0,
            groupCount: 0
          });
        }
        
        // 发送历史消息给新用户
        sendMessageHistory(ws);
        return;
      }
      
      // 处理聊天消息
      if (data.type === 'message') {
        console.log(`发送消息，用户: ${username}, 头像类型: ${avatarType}`);
        
        const chatMessage = {
          type: 'message',
          content: data.content,
          sender: username,
          avatarType: avatarType,
          timestamp: Math.floor(Date.now() / 1000)
        };
        broadcastMessage(chatMessage);
        addToHistory(chatMessage);
        
        // 清除该用户的输入状态
        if (typingUsers.has(username)) {
          typingUsers.delete(username);
          broadcastTypingStatus();
        }
        
        // 更新用户消息计数
        const profile = userProfiles.get(username);
        if (profile) {
          profile.messageCount = (profile.messageCount || 0) + 1;
          userProfiles.set(username, profile);
        }
        return;
      }
      
      // 处理图片消息
      if (data.type === 'image') {
        console.log(`接收图片消息，用户: ${username}`);
        
        try {
          const imageUrl = saveBase64File(data.content, imageUploadDir, '.jpg');
          
          const imageMessage = {
            type: 'image',
            content: imageUrl,
            sender: username,
            avatarType: avatarType,
            timestamp: Math.floor(Date.now() / 1000)
          };
          
          broadcastMessage(imageMessage);
          addToHistory(imageMessage);
          
          // 清除该用户的输入状态
          if (typingUsers.has(username)) {
            typingUsers.delete(username);
            broadcastTypingStatus();
          }
          
          // 更新用户消息计数
          const profile = userProfiles.get(username);
          if (profile) {
            profile.messageCount = (profile.messageCount || 0) + 1;
            userProfiles.set(username, profile);
          }
        } catch (err) {
          console.error('保存图片错误:', err);
          ws.send(JSON.stringify({
            type: 'error',
            content: '图片发送失败',
            timestamp: Math.floor(Date.now() / 1000)
          }));
        }
        return;
      }
      
      // 处理语音消息
      if (data.type === 'voice') {
        console.log(`接收语音消息，用户: ${username}, 时长: ${data.duration}秒, 内容类型: ${data.contentType || '未知'}`);
        
        try {
          // 检查语音数据是否存在
          if (!data.content) {
            throw new Error('语音数据为空');
          }
          
          // 根据contentType决定使用的文件扩展名
          let extension = '.webm';
          let mimeType = 'audio/webm';
          
          if (data.contentType) {
            if (data.contentType.includes('audio/webm')) {
              extension = '.webm';
              mimeType = 'audio/webm';
            } else if (data.contentType.includes('audio/mpeg') || data.contentType.includes('audio/mp3')) {
              extension = '.mp3';
              mimeType = 'audio/mpeg';
            } else if (data.contentType.includes('audio/wav')) {
              extension = '.wav';
              mimeType = 'audio/wav';
            } else if (data.contentType.includes('audio/ogg')) {
              extension = '.ogg';
              mimeType = 'audio/ogg';
            }
          }
          
          console.log(`使用文件扩展名: ${extension}, MIME类型: ${mimeType}`);
          
          // 确保语音目录存在
          if (!fs.existsSync(voiceUploadDir)) {
            fs.mkdirSync(voiceUploadDir, { recursive: true });
            console.log(`创建语音上传目录: ${voiceUploadDir}`);
          }
          
          const voiceUrl = saveBase64File(data.content, voiceUploadDir, extension);
          console.log(`语音文件已保存到: ${voiceUrl}`);
          
          const voiceMessage = {
            type: 'voice',
            content: voiceUrl,
            contentType: mimeType,
            duration: data.duration,
            sender: username,
            avatarType: avatarType,
            timestamp: Math.floor(Date.now() / 1000)
          };
          
          broadcastMessage(voiceMessage);
          addToHistory(voiceMessage);
          
          // 清除该用户的输入状态
          if (typingUsers.has(username)) {
            typingUsers.delete(username);
            broadcastTypingStatus();
          }
          
          // 更新用户消息计数
          const profile = userProfiles.get(username);
          if (profile) {
            profile.messageCount = (profile.messageCount || 0) + 1;
            userProfiles.set(username, profile);
          }
        } catch (err) {
          console.error('保存语音错误:', err);
          console.error('错误堆栈:', err.stack);
          
          ws.send(JSON.stringify({
            type: 'error',
            content: '语音发送失败: ' + err.message,
            timestamp: Math.floor(Date.now() / 1000)
          }));
        }
        return;
      }
      
      // 处理用户正在输入状态
      if (data.type === 'typing') {
        typingUsers.add(username);
        broadcastTypingStatus();
        return;
      }
      
      // 处理用户停止输入状态
      if (data.type === 'stopTyping') {
        typingUsers.delete(username);
        broadcastTypingStatus();
        return;
      }
      
      // 处理离开消息
      if (data.type === 'leave') {
        handleDisconnect(clientId, username);
        return;
      }
    } catch (err) {
      console.error('解析消息错误:', err);
    }
  });
  
  // 处理断开连接
  ws.on('close', () => {
    handleDisconnect(clientId, clients.get(clientId)?.username || username);
  });
  
  // 发送历史消息
  function sendMessageHistory(ws) {
    if (messageHistory.length > 0) {
      const historyMessage = {
        type: 'system',
        content: '以下是最近的消息记录',
        timestamp: Math.floor(Date.now() / 1000)
      };
      ws.send(JSON.stringify(historyMessage));
      
      // 延迟发送历史消息，让客户端有足够时间准备
      setTimeout(() => {
        messageHistory.forEach(msg => {
          ws.send(JSON.stringify(msg));
        });
      }, 500);
    }
  }
  
  // 发送初始系统消息
  const welcomeMessage = {
    type: 'system',
    content: `欢迎加入聊天室，当前在线 ${clients.size} 人`,
    timestamp: Math.floor(Date.now() / 1000)
  };
  ws.send(JSON.stringify(welcomeMessage));
});

// 广播消息到所有客户端
function broadcastMessage(message) {
  const messageStr = JSON.stringify(message);
  console.log('发送消息:', message.type);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// 广播用户数量
function broadcastUserCount() {
  const countMessage = {
    type: 'userCount',
    count: clients.size,
    timestamp: Math.floor(Date.now() / 1000)
  };
  const countStr = JSON.stringify(countMessage);
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(countStr);
    }
  });
}

// 广播输入状态
function broadcastTypingStatus() {
  const typingMessage = {
    type: 'typing',
    users: Array.from(typingUsers),
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  if (typingUsers.size === 0) {
    // 没有人在输入，发送停止输入消息
    const stopTypingMessage = {
      type: 'stopTyping',
      timestamp: Math.floor(Date.now() / 1000)
    };
    const stopStr = JSON.stringify(stopTypingMessage);
    
    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(stopStr);
      }
    });
    return;
  }
  
  const typingStr = JSON.stringify(typingMessage);
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(typingStr);
    }
  });
}

// 处理用户断开连接
function handleDisconnect(clientId, username) {
  console.log(`客户端 ${username} 断开连接`);
  
  // 从客户端列表中移除
  clients.delete(clientId);
  
  // 从输入状态列表中移除
  typingUsers.delete(username);
  
  // 向所有客户端广播断开连接消息
  const disconnectMessage = {
    type: 'system',
    content: `${username} 离开了聊天室，当前在线 ${clients.size} 人`,
    timestamp: Math.floor(Date.now() / 1000)
  };
  broadcastMessage(disconnectMessage);
  addToHistory(disconnectMessage);
  
  // 更新用户数量
  broadcastUserCount();
  
  // 更新输入状态
  broadcastTypingStatus();
}

// 定期清理死连接
setInterval(() => {
  clients.forEach((client, id) => {
    if (client.ws.readyState === WebSocket.CLOSED || client.ws.readyState === WebSocket.CLOSING) {
      handleDisconnect(id, client.username);
    }
  });
}, 30000); // 每30秒检查一次

// 启动服务器
const PORT = process.env.PORT || 9091;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}/`);
  console.log(`WebSocket 服务器运行在 ws://localhost:${PORT}/ws`);
}); 