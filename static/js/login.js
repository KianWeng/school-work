// 登录页面JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    // 检查是否已登录
    checkLoginStatus();
    
    // 表单提交事件
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const remember = document.getElementById('remember').checked;
        
        // 隐藏错误信息
        errorMessage.style.display = 'none';
        
        // 验证输入
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }
        
        // 显示加载状态
        const submitBtn = loginForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '登录中...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    remember: remember
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // 登录成功，跳转到首页
                window.location.href = '/';
            } else {
                // 登录失败，显示错误信息
                showError(data.error || '登录失败，请重试');
            }
        } catch (error) {
            console.error('登录错误:', error);
            showError('网络错误，请检查连接后重试');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    // 检查登录状态
    async function checkLoginStatus() {
        try {
            const response = await fetch('/api/user/info', {
                credentials: 'same-origin'
            });
            if (response.ok) {
                // 已登录，跳转到首页（只跳转一次，避免循环）
                if (window.location.pathname === '/login') {
                    window.location.href = '/';
                }
            }
            // 如果未登录（401或其他错误），继续显示登录页面，不做任何操作
            // 这是正常情况，不需要处理
        } catch (error) {
            // 网络错误时，继续显示登录页面
            // 不进行任何跳转操作，也不显示错误
        }
    }
});

