// DOM 元素
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');
const usernameInput = document.getElementById('usernameInput');
const loginButton = document.getElementById('loginButton');
const typingIndicator = document.getElementById('typingIndicator');
const onlineUsersDiv = document.getElementById('onlineUsers');
const scrollToBottomBtn = document.getElementById('scrollToBottom');
const unreadCountDiv = document.getElementById('unreadCount');
const emojiButton = document.getElementById('emojiButton');
const emojiPanel = document.getElementById('emojiPanel');
const emojiTabs = document.querySelectorAll('.emoji-tab');
const emojiCategories = document.querySelectorAll('.emoji-category');
const emojiItems = document.querySelectorAll('.emoji-item');

// 图片上传相关DOM元素
const imageButton = document.getElementById('imageButton');
const imageInput = document.getElementById('imageInput');
const imagePreviewPanel = document.getElementById('imagePreviewPanel');
const imagePreview = document.getElementById('imagePreview');
const sendImageButton = document.getElementById('sendImageButton');
const closeImagePreviewButton = document.getElementById('closeImagePreviewButton');

// 语音录制相关DOM元素
const voiceButton = document.getElementById('voiceButton');
const voiceRecordPanel = document.getElementById('voiceRecordPanel');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTime = document.getElementById('recordingTime');
const startRecordButton = document.getElementById('startRecordButton');
const stopRecordButton = document.getElementById('stopRecordButton');
const cancelRecordButton = document.getElementById('cancelRecordButton');
const sendVoiceButton = document.getElementById('sendVoiceButton');
const voiceWaveform = document.getElementById('voiceWaveform');

// 个人空间按钮
const profileButton = document.getElementById('profileButton');

// 变量
let ws = null;
let username = '';
let avatarType = '';
let reconnectAttempts = 0;
let typingTimeout = null;
let onlineUsers = 0;
let unreadCount = 0;
let isNearBottom = true; // 是否靠近底部
let recentEmojis = []; // 最近使用的表情
const MAX_RECENT_EMOJIS = 21; // 最大记录数量

// 图片相关变量
let selectedImage = null;

// 语音录制相关变量
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;
let recordingInterval = null;
let audioDuration = 0;
let audioBlob = null;
let isRecording = false;

// 初始化
function init() {
    // 首先检查是否有保存的用户名
    const savedUsername = localStorage.getItem('chatUsername');
    
    // 建立WebSocket连接
    connect();
    
    // 绑定事件
    bindEvents();
    
    // 随机生成一个用户名建议
    generateUsernameSuggestion();
    
    // 如果有保存的用户名
    if (savedUsername) {
        // 更新输入框
        usernameInput.value = savedUsername;
        
        // 预先配置个人空间按钮链接
        if (profileButton) {
            profileButton.href = `/profile.html?username=${encodeURIComponent(savedUsername)}`;
        }
        
        // 使用一个变量标记是否需要自动登录
        window.needAutoLogin = true;
        
        console.log("发现保存的用户名，准备自动登录:", savedUsername);
        
        // 尝试立即自动登录，如果WebSocket还没准备好，会在WebSocket连接打开后再次尝试
        autoLogin(savedUsername);
    }
    
    // 添加动画效果
    addAnimationEffects();
    
    // 加载最近使用的表情
    loadRecentEmojis();
    
    // 创建全屏图片预览容器
    createFullScreenImageViewer();
    
    // 调试函数 - 检查页面上所有重要元素的状态
    console.log("页面初始化完成，关键元素状态: ", {
        "messageInput元素是否存在": !!messageInput,
        "messageInput是否显示": messageInput ? window.getComputedStyle(messageInput).display : "元素不存在",
        "sendButton元素是否存在": !!sendButton,
        "sendButton是否显示": sendButton ? window.getComputedStyle(sendButton).display : "元素不存在",
        "input-container元素是否存在": !!document.querySelector('.input-container'),
        "input-container是否显示": document.querySelector('.input-container') ? 
            window.getComputedStyle(document.querySelector('.input-container')).display : "元素不存在"
    });
}

// 自动登录函数
function autoLogin(savedUsername) {
    // 无用户名无法登录
    if (!savedUsername) {
        console.log("无法自动登录，未保存用户名");
        return;
    }
    
    // 如果WebSocket还未连接，等待连接建立后再尝试
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log("WebSocket未连接，等待连接后自动登录");
        return; // connect函数中会在WebSocket连接打开后再次尝试自动登录
    }
    
    // 清除标记，已经不需要自动登录了
    window.needAutoLogin = false;
    
    // 设置用户名
    username = savedUsername;
    
    // 设置头像类型
    avatarType = getAvatarTypeForUser(username);
    
    // 更新UI显示用户已登录
    usernameInput.disabled = true;
    loginButton.disabled = true;
    loginButton.textContent = "已登录";
    
    // 启用消息输入和发送按钮
    messageInput.disabled = false;
    sendButton.disabled = false;
    
    // 启用媒体按钮
    emojiButton.disabled = false;
    imageButton.disabled = false;
    voiceButton.disabled = false;
    
    // 发送加入消息
    const message = {
        type: 'join',
        username: username,
        content: '',
        avatarType: avatarType
    };
    ws.send(JSON.stringify(message));
    
    // 显示个人空间按钮
    if (profileButton) {
        profileButton.href = `/profile.html?username=${encodeURIComponent(username)}`;
        profileButton.style.display = 'flex';
        setTimeout(() => {
            profileButton.classList.add('visible');
        }, 300);
    }
    
    // 消息输入框获得焦点
    setTimeout(() => {
        messageInput.focus();
    }, 500);
    
    console.log("自动登录完成，用户:", username);
}

// 添加动画效果
function addAnimationEffects() {
    // 添加点击涟漪效果
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// 生成随机用户名建议
function generateUsernameSuggestion() {
    const adjectives = ['快乐的', '聪明的', '友善的', '可爱的', '勇敢的', '活泼的', '睿智的', '优雅的', '幽默的', '阳光的'];
    const nouns = ['熊猫', '老虎', '狮子', '兔子', '海豚', '猫咪', '狐狸', '鹦鹉', '狼', '小鹿', '浣熊', '考拉'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    
    usernameInput.placeholder = `${adj}${noun}${num}`;
}

// 事件绑定
function bindEvents() {
    sendButton.addEventListener('click', sendMessage);
    loginButton.addEventListener('click', login);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        } else {
            // 发送正在输入的状态
            sendTypingStatus();
        }
    });
    
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // 窗口关闭前尝试优雅断开连接
    window.addEventListener('beforeunload', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // 发送一个断开连接的消息
            const message = {
                type: 'leave',
                username: username
            };
            ws.send(JSON.stringify(message));
        }
    });
    
    // 监听消息区域的滚动事件
    messagesDiv.addEventListener('scroll', handleScroll);
    
    // 点击回到底部按钮
    scrollToBottomBtn.addEventListener('click', () => {
        scrollToBottom();
        resetUnreadCount();
        hideScrollButton();
        
        // 添加点击动画
        scrollToBottomBtn.classList.add('clicked');
        setTimeout(() => {
            scrollToBottomBtn.classList.remove('clicked');
        }, 300);
    });
    
    // 窗口获得焦点时，如果用户在查看最新消息，则清除未读计数
    window.addEventListener('focus', () => {
        if (isNearBottom) {
            resetUnreadCount();
            hideScrollButton();
        }
    });
    
    // 当窗口大小变化时重新计算滚动位置
    window.addEventListener('resize', () => {
        if (isNearBottom) {
            scrollToBottom();
        }
    });
    
    // 表情按钮点击事件
    emojiButton.addEventListener('click', toggleEmojiPanel);
    
    // 表情选项卡点击事件
    emojiTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 激活点击的选项卡
            emojiTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 显示对应类别的表情
            const category = tab.getAttribute('data-category');
            emojiCategories.forEach(cat => {
                cat.classList.remove('active');
                if (cat.getAttribute('data-category') === category) {
                    cat.classList.add('active');
                }
            });
        });
    });
    
    // 表情项点击事件
    emojiItems.forEach(item => {
        item.addEventListener('click', () => {
            const emoji = item.getAttribute('data-emoji');
            insertEmoji(emoji);
        });
    });
    
    // 点击其他区域关闭表情面板
    document.addEventListener('click', (e) => {
        if (!emojiPanel.contains(e.target) && e.target !== emojiButton) {
            emojiPanel.classList.add('hidden');
        }
    });
    
    // 图片上传相关事件
    imageButton.addEventListener('click', () => {
        imageInput.click();
    });
    
    imageInput.addEventListener('change', handleImageSelect);
    
    closeImagePreviewButton.addEventListener('click', () => {
        imagePreviewPanel.classList.add('hidden');
        selectedImage = null;
    });
    
    sendImageButton.addEventListener('click', sendImage);
    
    // 语音录制相关事件
    voiceButton.addEventListener('click', toggleVoiceRecordPanel);
    
    startRecordButton.addEventListener('click', startVoiceRecording);
    stopRecordButton.addEventListener('click', stopVoiceRecording);
    cancelRecordButton.addEventListener('click', cancelVoiceRecording);
    sendVoiceButton.addEventListener('click', sendVoiceMessage);
}

// 处理滚动事件
function handleScroll() {
    const scrollPosition = messagesDiv.scrollTop + messagesDiv.clientHeight;
    const scrollHeight = messagesDiv.scrollHeight;
    
    // 如果滚动条接近底部，则认为用户看到了最新消息
    isNearBottom = scrollPosition >= scrollHeight - 50;
    
    if (isNearBottom) {
        resetUnreadCount();
        hideScrollButton();
    }
    
    // 更新滚动指示器
    updateScrollIndicators();
}

// 更新滚动阴影指示器
function updateScrollIndicators() {
    // 检查是否可以向上滚动
    if (messagesDiv.scrollTop > 10) {
        messagesDiv.classList.add('can-scroll-up');
    } else {
        messagesDiv.classList.remove('can-scroll-up');
    }
    
    // 检查是否可以向下滚动
    const canScrollDown = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight > 10;
    if (canScrollDown) {
        messagesDiv.classList.add('can-scroll-down');
    } else {
        messagesDiv.classList.remove('can-scroll-down');
    }
}

// 隐藏回到底部按钮
function hideScrollButton() {
    scrollToBottomBtn.classList.add('hidden');
}

// 显示回到底部按钮
function showScrollButton() {
    if (!isNearBottom) {
        scrollToBottomBtn.classList.remove('hidden');
    }
}

// 重置未读消息计数
function resetUnreadCount() {
    unreadCount = 0;
    updateUnreadCount();
}

// 更新未读消息计数显示
function updateUnreadCount() {
    unreadCountDiv.textContent = unreadCount;
    if (unreadCount > 0) {
        unreadCountDiv.style.display = 'flex';
    } else {
        unreadCountDiv.style.display = 'none';
    }
}

// 增加未读消息计数
function incrementUnreadCount() {
    if (!isNearBottom && username) {
        unreadCount++;
        updateUnreadCount();
        showScrollButton();
    }
}

// WebSocket连接
function connect() {
    // 自动检测主机名并连接
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '9091';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    try {
        ws = new WebSocket(`${wsProtocol}//${host}:${port}/ws`);
        
        ws.onopen = () => {
            statusDiv.textContent = '已连接';
            statusDiv.className = 'status connected';
            usernameInput.disabled = false;
            loginButton.disabled = false;
            reconnectAttempts = 0;
            
            // WebSocket连接已打开，如果需要自动登录，立即执行
            if (window.needAutoLogin) {
                const savedUsername = localStorage.getItem('chatUsername');
                if (savedUsername) {
                    console.log("WebSocket已连接，执行自动登录");
                    autoLogin(savedUsername);
                }
            }
        };

        ws.onclose = (event) => {
            statusDiv.textContent = '连接已断开';
            statusDiv.className = 'status disconnected';
            usernameInput.disabled = true;
            loginButton.disabled = true;
            messageInput.disabled = true;
            sendButton.disabled = true;
            
            // 添加重连逻辑，最多尝试5次，每次间隔增加
            if (reconnectAttempts < 5) {
                const delay = 1000 * Math.pow(1.5, reconnectAttempts);
                reconnectAttempts++;
                statusDiv.textContent = `连接已断开，${Math.round(delay/1000)}秒后重新连接...`;
                setTimeout(connect, delay);
            } else {
                statusDiv.textContent = '连接失败，请刷新页面重试';
            }
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                // 处理不同类型的消息
                if (message.type === 'userCount') {
                    // 更新在线用户数
                    onlineUsers = message.count;
                    updateOnlineUsers();
                } else if (message.type === 'typing') {
                    // 显示某人正在输入
                    if (message.username !== username) {
                        typingIndicator.textContent = `${message.username} 正在输入...`;
                    }
                } else if (message.type === 'stopTyping') {
                    // 清除输入状态
                    if (message.username !== username) {
                        typingIndicator.textContent = '';
                    }
                } else if (message.type === 'error') {
                    // 显示错误消息
                    addMessage({
                        type: 'system',
                        content: `错误: ${message.content}`,
                        timestamp: message.timestamp
                    });
                } else {
                    // 普通消息、系统消息、图片消息、语音消息等
                    addMessage(message);
                    
                    // 判断是否需要增加未读计数
                    if ((message.type === 'message' || message.type === 'image' || message.type === 'voice') && 
                        message.sender !== username) {
                        incrementUnreadCount();
                    }
                    
                    // 如果是系统消息并且包含用户数量信息
                    if (message.type === 'system' && (message.content.includes('加入') || message.content.includes('离开'))) {
                        // 使用正则表达式更新在线用户数
                        const match = message.content.match(/当前在线\s*(\d+)\s*人/);
                        if (match && match[1]) {
                            onlineUsers = parseInt(match[1]);
                            updateOnlineUsers();
                        }
                    }
                }
            } catch (err) {
                console.error('解析消息错误:', err);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
            statusDiv.textContent = '连接错误';
            statusDiv.className = 'status disconnected';
        };
    } catch (err) {
        console.error('WebSocket连接失败:', err);
        statusDiv.textContent = '连接失败';
        statusDiv.className = 'status disconnected';
        
        // 延迟重连
        setTimeout(connect, 3000);
    }
}

// 更新在线用户显示
function updateOnlineUsers() {
    if (onlineUsersDiv) {
        onlineUsersDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg> 在线用户: <strong>${onlineUsers}</strong> 人`;
    }
}

// 获取用户头像类型
function getAvatarTypeForUser(username) {
    if (!username) return 1;
    
    // 使用用户名的字符编码总和来确定头像类型
    let sum = 0;
    for (let i = 0; i < username.length; i++) {
        sum += username.charCodeAt(i);
    }
    // 确保值在1-5之间
    return (Math.abs(sum) % 5) + 1;
}

// 获取用户名首字母
function getInitials(username) {
    if (!username) return '';
    if (username.length === 1) return username.toUpperCase();
    return username.charAt(0).toUpperCase();
}

// 格式化时间戳
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 判断是今天、昨天还是更早的日期
    if (date >= today) {
        // 今天，只显示时间
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
        // 昨天
        return `昨天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        // 更早日期，显示完整日期和时间
        return date.toLocaleString([], {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// 添加消息到聊天区域
function addMessage(message) {
    const messageDiv = document.createElement('div');
    
    if (message.type === 'system') {
        messageDiv.className = 'message system';
        messageDiv.textContent = message.content;
    } else {
        messageDiv.className = `message ${message.sender === username ? 'sent' : 'received'}`;
        
        // 确保头像类型存在，默认为1
        const senderAvatarType = message.avatarType || getAvatarTypeForUser(message.sender);
        const time = formatTime(message.timestamp);
        
        // 创建头像
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `avatar avatar-${senderAvatarType}`;
        avatarDiv.textContent = getInitials(message.sender);
        
        // 添加点击事件，点击头像跳转到个人空间
        avatarDiv.style.cursor = 'pointer';
        avatarDiv.title = `查看 ${message.sender} 的个人空间`;
        avatarDiv.addEventListener('click', function() {
            window.location.href = `/profile.html?username=${encodeURIComponent(message.sender)}`;
        });
        
        // 创建消息内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 创建消息头部（发送者和时间）
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = message.sender;
        
        // 也可以让用户名点击跳转到个人空间
        senderSpan.style.cursor = 'pointer';
        senderSpan.addEventListener('click', function() {
            window.location.href = `/profile.html?username=${encodeURIComponent(message.sender)}`;
        });
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = time;
        
        headerDiv.appendChild(senderSpan);
        headerDiv.appendChild(timeSpan);
        contentDiv.appendChild(headerDiv);
        
        // 根据消息类型添加不同的内容
        if (message.type === 'message') {
            // 文本消息
            const contentSpan = document.createElement('span');
            contentSpan.className = 'content';
            contentSpan.textContent = message.content;
            contentDiv.appendChild(contentSpan);
        } else if (message.type === 'image') {
            // 图片消息
            const contentSpan = document.createElement('span');
            contentSpan.className = 'content';
            contentSpan.textContent = '发送了一张图片';
            
            const imageElement = document.createElement('img');
            imageElement.className = 'message-image';
            imageElement.src = message.content;
            imageElement.alt = '图片消息';
            imageElement.loading = 'lazy';
            
            // 点击图片可以查看原图
            imageElement.addEventListener('click', () => {
                showFullScreenImage(message.content);
            });
            
            contentDiv.appendChild(contentSpan);
            contentDiv.appendChild(imageElement);
        } else if (message.type === 'voice') {
            // 语音消息
            const contentSpan = document.createElement('span');
            contentSpan.className = 'content';
            contentSpan.textContent = '发送了一条语音消息';
            
            const voiceElement = document.createElement('div');
            voiceElement.className = 'voice-message';
            
            const voiceIcon = document.createElement('div');
            voiceIcon.className = 'voice-message-icon voice-message-play';
            
            // 创建两种不同状态的图标 - 播放和暂停
            const playIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>`;
            
            const pauseIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <rect x="10" y="8" width="2" height="8"></rect>
                <rect x="14" y="8" width="2" height="8"></rect>
            </svg>`;
            
            voiceIcon.innerHTML = playIconSVG;
            
            const voiceDuration = document.createElement('div');
            voiceDuration.className = 'voice-message-duration';
            voiceDuration.textContent = `${message.duration || '0'}秒`;
            
            voiceElement.appendChild(voiceIcon);
            voiceElement.appendChild(voiceDuration);
            
            // 点击播放语音
            let audio = null;
            let isPlaying = false;
            
            voiceElement.addEventListener('click', () => {
                try {
                if (!audio) {
                        console.log('创建音频对象，音频源类型:', message.contentType || '未知');
                        console.log('音频URL:', message.content);
                        
                        // 确定MIME类型
                        let mimeType = message.contentType || 'audio/webm';
                        
                        // 如果消息内容是服务器返回的URL（而不是Base64数据）
                        if (message.content.startsWith('/uploads/')) {
                            // 根据文件扩展名确定MIME类型
                            if (message.content.endsWith('.webm')) {
                                mimeType = 'audio/webm';
                            } else if (message.content.endsWith('.mp3')) {
                                mimeType = 'audio/mpeg';
                            } else if (message.content.endsWith('.wav')) {
                                mimeType = 'audio/wav';
                            } else if (message.content.endsWith('.ogg')) {
                                mimeType = 'audio/ogg';
                            }
                        }
                        
                        console.log('确定的MIME类型:', mimeType);
                        
                        // 创建音频元素
                    audio = new Audio(message.content);
                        
                        // 添加错误处理
                        audio.addEventListener('error', (e) => {
                            console.error('音频播放错误:', e);
                            console.error('详细错误信息:', 
                                audio.error ? `代码:${audio.error.code}, 消息:${audio.error.message}` : '未知错误');
                            alert(`音频播放失败: ${getAudioErrorMessage(audio.error)}`);
                            voiceIcon.classList.remove('playing');
                            voiceIcon.innerHTML = playIconSVG;
                            isPlaying = false;
                        });
                        
                    audio.addEventListener('ended', () => {
                            console.log('音频播放结束');
                        voiceIcon.classList.remove('playing');
                            voiceIcon.innerHTML = playIconSVG;
                            isPlaying = false;
                        });
                        
                        // 添加加载事件
                        audio.addEventListener('canplaythrough', () => {
                            console.log('音频加载完成，可以播放');
                    });
                }
                
                    if (!isPlaying) {
                        console.log('尝试播放音频');
                        
                        // 确保音频已加载
                        audio.load();
                        let playPromise = audio.play();
                        
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('音频播放成功');
                    voiceIcon.classList.add('playing');
                                voiceIcon.innerHTML = pauseIconSVG;
                                isPlaying = true;
                            }).catch(error => {
                                console.error('播放失败:', error);
                                // 可能是浏览器政策要求用户交互才能播放
                                alert('播放失败，请确保允许网站播放音频');
                            });
                        }
                } else {
                        console.log('暂停音频');
                    audio.pause();
                    audio.currentTime = 0;
                    voiceIcon.classList.remove('playing');
                        voiceIcon.innerHTML = playIconSVG;
                        isPlaying = false;
                }
                } catch (error) {
                    console.error('处理音频时出错:', error);
                    alert('音频播放出错: ' + error.message);
                }
            });
            
            function getAudioErrorMessage(error) {
                if (!error) return '未知错误';
                
                switch(error.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                        return '播放被中止';
                    case MediaError.MEDIA_ERR_NETWORK:
                        return '网络错误';
                    case MediaError.MEDIA_ERR_DECODE:
                        return '解码错误';
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        return '音频格式不受支持';
                    default:
                        return `错误代码: ${error.code}`;
                }
            }
            
            contentDiv.appendChild(contentSpan);
            contentDiv.appendChild(voiceElement);
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    }
    
    messagesDiv.appendChild(messageDiv);
    
    // 淡入动画效果增强
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
    
    // 如果用户当前在查看底部，则自动滚动到底部
    if (isNearBottom) {
        scrollToBottom();
    }
    
    // 清除输入状态指示器
    typingIndicator.textContent = '';
}

// 滚动到底部
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    isNearBottom = true;
}

// 发送消息
function sendMessage() {
    const content = messageInput.value.trim();
    if (content && ws && ws.readyState === WebSocket.OPEN) {
        const message = {
            type: 'message',
            username: username,
            content: content,
            avatarType: avatarType
        };
        ws.send(JSON.stringify(message));
        messageInput.value = '';
        
        // 清除正在输入状态
        clearTimeout(typingTimeout);
        const stopTypingMessage = {
            type: 'stopTyping',
            username: username
        };
        ws.send(JSON.stringify(stopTypingMessage));
        
        // 发送消息后滚动到底部
        scrollToBottom();
        resetUnreadCount();
        hideScrollButton();
    }
}

// 登录函数
function login() {
    // 获取用户名
    username = usernameInput.value.trim();
    
    // 如果用户名为空，使用随机生成的用户名
    if (!username) {
        const adjectives = ['快乐的', '聪明的', '友善的', '可爱的', '勇敢的', '活泼的'];
        const nouns = ['熊猫', '老虎', '狮子', '兔子', '海豚', '猫咪', '狐狸'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 1000);
        username = `${adj}${noun}${num}`;
        usernameInput.value = username;
    }
    
    console.log("登录用户名:", username);
        
    // 保存到本地存储
        localStorage.setItem('chatUsername', username);
        
    // 设置头像类型
    avatarType = getAvatarTypeForUser(username);
    
    // 显示设置
        usernameInput.disabled = true;
        loginButton.disabled = true;
    loginButton.textContent = "已登录";
    
    // 启用消息输入和发送按钮
        messageInput.disabled = false;
        sendButton.disabled = false;
    
    // 启用媒体按钮
        emojiButton.disabled = false;
        imageButton.disabled = false;
        voiceButton.disabled = false;
        
    // 发送加入消息
    if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
            type: 'join',
            username: username,
            content: '',
            avatarType: avatarType
        };
        ws.send(JSON.stringify(message));
    }
    
    // 显示个人空间按钮
    if (profileButton) {
        profileButton.href = `/profile.html?username=${encodeURIComponent(username)}`;
        profileButton.style.display = 'flex';
        setTimeout(() => {
            profileButton.classList.add('visible');
        }, 300);
    }
    
    // 消息输入框获得焦点
    setTimeout(() => {
        messageInput.focus();
    }, 500);
    
    console.log("登录完成，所有输入框状态:", {
        "usernameInput disabled": usernameInput.disabled,
        "loginButton disabled": loginButton.disabled,
        "messageInput disabled": messageInput.disabled,
        "sendButton disabled": sendButton.disabled
    });
    
    // 添加登录后的界面元素显示检查
    console.log("登录后界面元素显示状态: ", {
        "messageInput元素是否存在": !!messageInput,
        "messageInput是否显示": messageInput ? window.getComputedStyle(messageInput).display : "元素不存在",
        "sendButton元素是否存在": !!sendButton,
        "sendButton是否显示": sendButton ? window.getComputedStyle(sendButton).display : "元素不存在",
        "input-container元素是否存在": !!document.querySelector('.input-container'),
        "input-container是否显示": document.querySelector('.input-container') ? 
            window.getComputedStyle(document.querySelector('.input-container')).display : "元素不存在",
        "input-container样式": document.querySelector('.input-container') ? 
            {
                display: window.getComputedStyle(document.querySelector('.input-container')).display,
                visibility: window.getComputedStyle(document.querySelector('.input-container')).visibility,
                opacity: window.getComputedStyle(document.querySelector('.input-container')).opacity,
                height: window.getComputedStyle(document.querySelector('.input-container')).height
            } : "元素不存在"
    });
}

// 发送正在输入状态
function sendTypingStatus() {
    if (!username || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    clearTimeout(typingTimeout);
    
    const message = {
        type: 'typing',
        username: username
    };
    
    ws.send(JSON.stringify(message));
    
    // 设置3秒后清除输入状态
    typingTimeout = setTimeout(() => {
        const stopTypingMessage = {
            type: 'stopTyping',
            username: username
        };
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(stopTypingMessage));
        }
    }, 3000);
}

// 切换表情面板显示/隐藏
function toggleEmojiPanel() {
    emojiPanel.classList.toggle('hidden');
}

// 插入表情到输入框
function insertEmoji(emoji) {
    // 获取当前光标位置
    const cursorPos = messageInput.selectionStart;
    
    // 拆分文本
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);
    
    // 在光标位置插入表情
    messageInput.value = textBefore + emoji + textAfter;
    
    // 更新光标位置
    const newPos = cursorPos + emoji.length;
    messageInput.setSelectionRange(newPos, newPos);
    
    // 恢复输入框焦点
    messageInput.focus();
    
    // 添加到最近使用列表
    addToRecentEmojis(emoji);
}

// 添加表情到最近使用列表
function addToRecentEmojis(emoji) {
    // 从本地存储加载
    let recentEmojis = JSON.parse(localStorage.getItem('recentEmojis') || '[]');
    
    // 如果已存在，先移除
    recentEmojis = recentEmojis.filter(e => e !== emoji);
    
    // 添加到列表开头
    recentEmojis.unshift(emoji);
    
    // 限制数量
    if (recentEmojis.length > MAX_RECENT_EMOJIS) {
        recentEmojis = recentEmojis.slice(0, MAX_RECENT_EMOJIS);
    }
    
    // 保存到本地存储
    localStorage.setItem('recentEmojis', JSON.stringify(recentEmojis));
    
    // 更新界面
    updateRecentEmojis(recentEmojis);
}

// 加载最近使用的表情
function loadRecentEmojis() {
    const recentEmojis = JSON.parse(localStorage.getItem('recentEmojis') || '[]');
    updateRecentEmojis(recentEmojis);
}

// 更新最近使用的表情界面
function updateRecentEmojis(emojis) {
    const recentCategory = document.querySelector('.emoji-category[data-category="recent"]');
    recentCategory.innerHTML = '';
    
    if (emojis.length === 0) {
        recentCategory.innerHTML = '<div class="no-recent">没有最近使用的表情</div>';
        return;
    }
    
    emojis.forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'emoji-item';
        button.setAttribute('data-emoji', emoji);
        button.textContent = emoji;
        button.addEventListener('click', () => {
            insertEmoji(emoji);
        });
        recentCategory.appendChild(button);
    });
}

// 创建全屏图片预览容器
function createFullScreenImageViewer() {
    const overlay = document.createElement('div');
    overlay.className = 'full-size-image-overlay';
    overlay.id = 'fullImageOverlay';
    
    const img = document.createElement('img');
    img.className = 'full-size-image';
    img.id = 'fullSizeImage';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-full-image';
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('visible');
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('visible');
        }
    });
    
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
}

// 显示全屏图片
function showFullScreenImage(imageUrl) {
    const overlay = document.getElementById('fullImageOverlay');
    const img = document.getElementById('fullSizeImage');
    
    img.src = imageUrl;
    overlay.classList.add('visible');
}

// 图片选择处理
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            selectedImage = e.target.result;
            imagePreview.src = selectedImage;
            imagePreviewPanel.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
    }
    
    // 清空input，以便同一文件可以再次选择
    event.target.value = '';
}

// 发送图片
function sendImage() {
    if (!selectedImage || !ws || ws.readyState !== WebSocket.OPEN || !username) {
        return;
    }
    
    const message = {
        type: 'image',
        content: selectedImage,
        username: username
    };
    
    ws.send(JSON.stringify(message));
    
    // 清空选中图片和隐藏预览面板
    selectedImage = null;
    imagePreviewPanel.classList.add('hidden');
    
    // 发送消息后滚动到底部
    scrollToBottom();
    resetUnreadCount();
    hideScrollButton();
}

// 切换语音录制面板
function toggleVoiceRecordPanel() {
    voiceRecordPanel.classList.toggle('hidden');
    resetVoiceUI();
}

// 重置语音录制界面
function resetVoiceUI() {
    stopRecordButton.classList.add('hidden');
    cancelRecordButton.classList.add('hidden');
    sendVoiceButton.classList.add('hidden');
    startRecordButton.classList.remove('hidden');
    recordingStatus.textContent = '点击开始录音';
    recordingTime.textContent = '00:00';
    recordingTime.classList.remove('active');
    
    // 清除已录制的数据
    audioChunks = [];
    audioDuration = 0;
    audioBlob = null;
}

// 开始语音录制
function startVoiceRecording() {
    if (isRecording) return;
    
    // 获取浏览器支持的音频格式
    function getSupportedMimeType() {
        const possibleTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4;codecs=opus',
            'audio/mp4',
            'audio/mpeg'
        ];
        
        for (const type of possibleTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log("浏览器支持的音频MIME类型:", type);
                return type;
            }
        }
        
        console.warn("没有找到支持的音频MIME类型，将使用默认类型");
        return '';
    }
    
    // 请求麦克风权限
    navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: 1,
            sampleRate: 44100
        } 
    })
        .then(stream => {
            isRecording = true;
            
            // 使用更兼容的音频格式配置
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : {};
            
            try {
                console.log("创建MediaRecorder，使用MIME类型:", mimeType || "默认");
                mediaRecorder = new MediaRecorder(stream, options);
                console.log("实际使用的MIME类型:", mediaRecorder.mimeType);
            } catch (e) {
                console.error("创建MediaRecorder失败，回退到默认配置:", e);
                try {
                    // 无选项创建
            mediaRecorder = new MediaRecorder(stream);
                    console.log("回退成功，使用的MIME类型:", mediaRecorder.mimeType);
                } catch (err) {
                    console.error("完全无法创建MediaRecorder:", err);
                    alert("您的浏览器不支持录音功能");
                    
                    // 清理资源
                    stream.getTracks().forEach(track => track.stop());
                    isRecording = false;
                    return;
                }
            }
            
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    console.log("接收到录音数据:", event.data.size, "字节");
                audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                isRecording = false;
                
                // 创建音频Blob
                console.log("录制完成，创建音频Blob...");
                console.log("录制的音频块数:", audioChunks.length);
                
                if (audioChunks.length === 0) {
                    console.error("没有录制到音频数据");
                    alert("没有录制到音频数据，请重试或检查麦克风权限");
                    
                    // 停止所有音轨
                    stream.getTracks().forEach(track => track.stop());
                    resetVoiceUI();
                    return;
                }
                
                // 使用与录制相同的MIME类型
                const blobOptions = { type: mediaRecorder.mimeType };
                console.log("创建Blob使用的MIME类型:", blobOptions.type);
                
                try {
                    audioBlob = new Blob(audioChunks, blobOptions);
                    console.log("创建的Blob大小:", audioBlob.size, "字节, 类型:", audioBlob.type);
                    
                    if (audioBlob.size < 100) {
                        console.warn("音频数据过小，可能录制失败");
                        alert("录制的音频数据过小，请重试");
                        
                        // 停止所有音轨
                        stream.getTracks().forEach(track => track.stop());
                        resetVoiceUI();
                        return;
                    }
                    
                    // 测试播放录制的内容
                    try {
                        const testAudioURL = URL.createObjectURL(audioBlob);
                        console.log("测试音频URL:", testAudioURL);
                        const testAudio = new Audio(testAudioURL);
                        
                        testAudio.onloadedmetadata = () => {
                            console.log("测试音频加载成功，时长:", testAudio.duration, "秒");
                            if (testAudio.duration < 0.2) {
                                console.warn("录制的音频时长过短");
                            }
                        };
                        
                        testAudio.onerror = (e) => {
                            console.error("测试音频加载失败:", e);
                        };
                    } catch (e) {
                        console.error("测试音频创建失败:", e);
                    }
                } catch (blobError) {
                    console.error("创建Blob失败:", blobError);
                    alert("音频处理失败: " + blobError.message);
                    
                    // 停止所有音轨
                    stream.getTracks().forEach(track => track.stop());
                    resetVoiceUI();
                    return;
                }
                
                // 停止所有音轨
                stream.getTracks().forEach(track => track.stop());
                
                // 更新UI
                startRecordButton.classList.add('hidden');
                stopRecordButton.classList.add('hidden');
                sendVoiceButton.classList.remove('hidden');
                cancelRecordButton.classList.remove('hidden');
                recordingStatus.textContent = '录音完成';
                recordingTime.classList.remove('active');
                
                // 显示波形（在实际实现中可以使用更复杂的波形可视化）
                renderWaveform();
            };
            
            mediaRecorder.onerror = (event) => {
                console.error("录音错误:", event.error);
                recordingStatus.textContent = '录音出错';
                isRecording = false;
                
                // 停止所有音轨
                stream.getTracks().forEach(track => track.stop());
                resetVoiceUI();
            };
            
            // 开始录制
            recordStartTime = Date.now();
            try {
                mediaRecorder.start(100); // 每100毫秒生成一个数据块
                console.log("录音已开始");
            } catch (startError) {
                console.error("开始录音失败:", startError);
                alert("无法开始录音: " + startError.message);
                isRecording = false;
                stream.getTracks().forEach(track => track.stop());
                resetVoiceUI();
                return;
            }
            
            // 更新UI
            startRecordButton.classList.add('hidden');
            stopRecordButton.classList.remove('hidden');
            cancelRecordButton.classList.remove('hidden');
            recordingStatus.textContent = '正在录音...';
            recordingTime.classList.add('active');
            
            // 更新录音时间
            recordingInterval = setInterval(updateRecordingTime, 1000);
        })
        .catch(error => {
            console.error('获取麦克风失败:', error);
            recordingStatus.textContent = '无法访问麦克风';
            // 显示更详细的错误信息
            if (error.name === 'NotAllowedError') {
                recordingStatus.textContent = '麦克风访问被拒绝，请授予权限';
            } else if (error.name === 'NotFoundError') {
                recordingStatus.textContent = '未找到麦克风设备';
            } else {
                recordingStatus.textContent = `麦克风错误: ${error.name}`;
            }
        });
}

// 停止语音录制
function stopVoiceRecording() {
    if (!isRecording || !mediaRecorder) return;
    
    clearInterval(recordingInterval);
    mediaRecorder.stop();
    audioDuration = Math.round((Date.now() - recordStartTime) / 1000);
}

// 取消语音录制
function cancelVoiceRecording() {
    if (isRecording && mediaRecorder) {
        clearInterval(recordingInterval);
        mediaRecorder.stop();
    }
    
    // 重置UI和数据
    resetVoiceUI();
}

// 更新录音时间显示
function updateRecordingTime() {
    const seconds = Math.floor((Date.now() - recordStartTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 渲染简单波形（示例实现）
function renderWaveform() {
    // 在实际实现中，可以使用Web Audio API分析音频并生成真实的波形
    // 这里仅作为简化的示意
    voiceWaveform.innerHTML = '';
    
    const barCount = 30;
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        bar.style.height = `${Math.random() * 32 + 5}px`;
        bar.style.backgroundColor = `hsl(${Math.random() * 30 + 210}, 70%, 60%)`;
        bar.style.width = '2px';
        bar.style.margin = '0 1px';
        bar.style.display = 'inline-block';
        voiceWaveform.appendChild(bar);
    }
}

// 发送语音消息
function sendVoiceMessage() {
    if (!audioBlob || !ws || ws.readyState !== WebSocket.OPEN || !username) {
        return;
    }
    
    console.log("准备发送语音消息，Blob类型:", audioBlob.type, "大小:", audioBlob.size);
    
    // 将Blob转换为Base64
    const reader = new FileReader();
    reader.onloadend = function() {
        try {
            const audioBase64 = reader.result;
            console.log("音频数据格式检查:");
            console.log("- 是否为字符串:", typeof audioBase64 === 'string');
            console.log("- 是否以data:开头:", audioBase64.startsWith('data:'));
            console.log("- 数据长度:", audioBase64.length);
            console.log("- 前100个字符:", audioBase64.substring(0, 100).replace(/[^\x20-\x7E]/g, '?'));
            
            // 确保编码格式一致
            let contentToSend = audioBase64;
            let contentType = audioBlob.type || 'audio/webm';
            
            // 对格式进行一些简化，避免复杂的MIME类型参数
            if (audioBase64.includes('codecs=')) {
                console.log("检测到codecs参数，尝试简化");
                // 保留基本MIME类型
                const mainType = contentType.split(';')[0].trim();
                
                // 重新构造一个简单的data URI
                const base64Index = audioBase64.indexOf(';base64,');
                if (base64Index !== -1) {
                    const dataContent = audioBase64.substring(base64Index + 8);
                    contentToSend = `data:${mainType};base64,${dataContent}`;
                    console.log("简化后的URI前缀:", contentToSend.substring(0, 50));
                }
            }
            
            // 发送消息
        const message = {
            type: 'voice',
                content: contentToSend,
                contentType: contentType,
            duration: audioDuration,
            username: username
        };
        
            console.log("发送语音消息，类型:", message.contentType, "时长:", message.duration);
        ws.send(JSON.stringify(message));
        
        // 重置UI和隐藏面板
        resetVoiceUI();
        voiceRecordPanel.classList.add('hidden');
        
        // 发送消息后滚动到底部
        scrollToBottom();
        resetUnreadCount();
        hideScrollButton();
        } catch (error) {
            console.error("准备语音消息时出错:", error);
            alert("语音消息准备失败，请重试");
        }
    };
    
    reader.onerror = function(error) {
        console.error("读取音频数据失败:", error);
        alert("语音文件读取失败");
    };
    
    try {
        console.log("开始将音频Blob转换为DataURL...");
    reader.readAsDataURL(audioBlob);
    } catch (error) {
        console.error("readAsDataURL调用失败:", error);
        
        // 尝试其他方法
        try {
            console.log("尝试替代方法...");
            // 创建临时URL
            const url = URL.createObjectURL(audioBlob);
            console.log("创建了临时URL:", url);
            alert("语音数据处理出错，请重新录制");
        } catch (e) {
            console.error("替代方法也失败:", e);
            alert("浏览器不支持语音数据处理");
        }
    }
}

// 文档加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // 初始滚动到底部
    setTimeout(() => {
        scrollToBottom();
        // 初始化滚动指示器
        updateScrollIndicators();
    }, 100);
}); 