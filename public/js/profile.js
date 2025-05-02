/**
 * 个人空间页面JavaScript
 * 处理用户资料的展示、编辑和保存
 */

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const avatarDisplay = document.getElementById('avatar-display');
    const usernameDisplay = document.getElementById('username-display');
    const signatureDisplay = document.getElementById('signature-display');
    const messageCountEl = document.getElementById('message-count');
    const friendCountEl = document.getElementById('friend-count');
    const groupCountEl = document.getElementById('group-count');
    
    const usernameInput = document.getElementById('username');
    const signatureInput = document.getElementById('signature');
    const charCounter = document.getElementById('char-counter');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const saveBtn = document.getElementById('save-profile');
    const resetBtn = document.getElementById('reset-profile');
    const messageEl = document.getElementById('message');
    const profileEditSection = document.querySelector('.profile-edit-section');
    const backButton = document.getElementById('backButton');
    
    // 当前用户数据
    let currentUser = null;
    let selectedAvatarColor = '';
    let isViewingSelf = true; // 标记是否正在查看自己的资料
    let loggedInUsername = localStorage.getItem('chatUsername'); // 当前登录的用户
    
    // 返回按钮功能
    window.goBack = function() {
        // 如果是从聊天页面点击头像过来的，则返回聊天页面
        if (document.referrer.includes('chat.html')) {
            window.location.href = '/chat.html';
        } else {
            // 如果是查看他人资料，返回到自己的资料页
            if (!isViewingSelf) {
                window.location.href = '/profile.html';
            } else {
                // 否则默认返回聊天页
                window.location.href = '/chat.html';
            }
        }
    };
    
    // 获取用户资料
    function getUserProfile() {
        // 尝试从URL参数中获取用户名
        let usernameFromUrl = '';
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('username')) {
            usernameFromUrl = urlParams.get('username');
        }

        // 判断是否在查看自己的个人空间
        isViewingSelf = !usernameFromUrl || usernameFromUrl === loggedInUsername;
        
        // 更新页面标题，显示是谁的个人空间
        document.title = isViewingSelf ? 
            '个人空间 - 聊天室' : 
            `${usernameFromUrl}的个人空间 - 聊天室`;

        // 更新返回按钮文字，如果是查看他人资料，显示"返回我的资料"
        if (!isViewingSelf) {
            backButton.innerHTML = '<span>⬅️</span> 返回我的资料';
        }

        let fetchUrl = '/api/user/profile';
        // 如果URL中有用户名参数，则添加到请求中
        if (usernameFromUrl) {
            fetchUrl += `?username=${encodeURIComponent(usernameFromUrl)}`;
        }

        fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('未登录或无法获取用户资料');
            }
            return response.json();
        })
        .then(data => {
            currentUser = data;
            updateProfileDisplay();
            
            // 只有查看自己的资料时才显示编辑区域和填充表单
            if (isViewingSelf) {
                populateForm();
                profileEditSection.style.display = 'block';
            } else {
                // 查看他人资料时隐藏编辑区域
                profileEditSection.style.display = 'none';
                
                // 可以添加一个提示，表明在查看他人的资料
                const profileContainer = document.querySelector('.profile-container');
                const viewingNotice = document.createElement('div');
                viewingNotice.className = 'viewing-notice';
                viewingNotice.textContent = `您正在查看 ${currentUser.username} 的个人空间`;
                // 将提示插入到资料统计信息之后
                const statsSection = document.querySelector('.profile-stats');
                profileContainer.insertBefore(viewingNotice, statsSection.nextSibling);
            }
        })
        .catch(error => {
            showMessage(error.message, 'error');
            console.error('获取用户资料失败:', error);
            // 如果未登录，跳转到登录页
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 2000);
        });
    }
    
    // 更新个人资料显示
    function updateProfileDisplay() {
        if (!currentUser) return;
        
        // 显示用户名和签名
        usernameDisplay.textContent = currentUser.username;
        signatureDisplay.textContent = currentUser.signature || '这个人很懒，什么都没写...';
        
        // 显示头像
        const avatarColor = currentUser.avatarColor || '1';
        avatarDisplay.className = `avatar avatar-${avatarColor}`;
        avatarDisplay.textContent = currentUser.username.charAt(0).toUpperCase();
        
        // 更新统计数据
        messageCountEl.textContent = currentUser.messageCount || 0;
        friendCountEl.textContent = currentUser.friendCount || 0;
        groupCountEl.textContent = currentUser.groupCount || 0;
    }
    
    // 填充表单
    function populateForm() {
        if (!currentUser) return;
        
        usernameInput.value = currentUser.username;
        signatureInput.value = currentUser.signature || '';
        updateCharCounter();
        
        // 设置当前头像颜色
        selectedAvatarColor = currentUser.avatarColor || '1';
        avatarOptions.forEach(option => {
            const colorNum = option.getAttribute('data-color');
            if (colorNum === selectedAvatarColor) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    // 更新字符计数器
    function updateCharCounter() {
        const maxLength = 100;
        const currentLength = signatureInput.value.length;
        charCounter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength) {
            charCounter.style.color = 'var(--error-color)';
        } else {
            charCounter.style.color = 'var(--light-text)';
        }
    }
    
    // 保存用户资料
    function saveUserProfile() {
        // 如果不是查看自己的资料，则不允许保存
        if (!isViewingSelf) {
            showMessage('您只能编辑自己的个人资料', 'error');
            return;
        }
        
        const username = usernameInput.value.trim();
        const signature = signatureInput.value.trim();
        
        if (!username) {
            showMessage('用户名不能为空', 'error');
            return;
        }
        
        if (signature.length > 100) {
            showMessage('个性签名不能超过100个字符', 'error');
            return;
        }
        
        const updatedProfile = {
            username: username,
            signature: signature,
            avatarColor: selectedAvatarColor
        };
        
        fetch('/api/user/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify(updatedProfile)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('保存失败，请稍后重试');
            }
            return response.json();
        })
        .then(data => {
            currentUser = data;
            updateProfileDisplay();
            showMessage('个人资料已更新', 'success');
            
            // 如果用户名改变，更新本地存储
            const oldUsername = localStorage.getItem('chatUsername');
            if (oldUsername !== username) {
                localStorage.setItem('chatUsername', username);
                loggedInUsername = username; // 更新当前登录的用户名
            }
        })
        .catch(error => {
            showMessage(error.message, 'error');
            console.error('保存资料失败:', error);
        });
    }
    
    // 重置表单
    function resetForm() {
        // 如果不是查看自己的资料，则不允许重置
        if (!isViewingSelf) {
            showMessage('您只能编辑自己的个人资料', 'error');
            return;
        }
        
        populateForm();
        showMessage('已重置为原始资料', 'success');
    }
    
    // 显示消息提示
    function showMessage(text, type = 'success') {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        
        // 2秒后自动隐藏
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 2000);
    }
    
    // 事件监听器
    signatureInput.addEventListener('input', updateCharCounter);
    
    avatarOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 如果不是查看自己的资料，则不允许修改
            if (!isViewingSelf) {
                showMessage('您只能编辑自己的个人资料', 'error');
                return;
            }
            
            // 移除其他选项的选中状态
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            // 设置当前选项为选中状态
            this.classList.add('selected');
            // 保存选中的颜色
            selectedAvatarColor = this.getAttribute('data-color');
            
            // 更新头像预览
            const previews = document.querySelectorAll('.avatar-preview');
            previews.forEach(preview => {
                preview.textContent = currentUser.username.charAt(0).toUpperCase();
            });
        });
    });
    
    saveBtn.addEventListener('click', saveUserProfile);
    resetBtn.addEventListener('click', resetForm);
    
    // 退出登录功能
    window.logout = function() {
        localStorage.removeItem('chatUsername');
        showMessage('已退出登录', 'success');
        setTimeout(() => {
            window.location.href = '/chat.html';
        }, 1000);
    };
    
    // 初始化
    getUserProfile();
}); 