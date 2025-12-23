// 注册页面JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // 检查是否已登录
    checkLoginStatus();
    
    // 实时验证密码一致性
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('密码不一致');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
    
    passwordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('密码不一致');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
    
    // 验证用户名格式
    const usernameInput = document.getElementById('username');
    usernameInput.addEventListener('input', () => {
        const username = usernameInput.value.trim();
        if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            usernameInput.setCustomValidity('用户名只能包含字母、数字和下划线，长度3-20个字符');
        } else {
            usernameInput.setCustomValidity('');
        }
    });
    
    // 表单提交事件
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        const name = document.getElementById('name').value.trim();
        
        // 隐藏消息
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        // 验证输入
        if (!username || !password || !confirmPassword || !name) {
            showError('所有字段都不能为空');
            return;
        }
        
        // 验证用户名格式
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            showError('用户名格式不正确，只能包含字母、数字和下划线，长度3-20个字符');
            return;
        }
        
        // 验证密码长度
        if (password.length < 6) {
            showError('密码至少需要6个字符');
            return;
        }
        
        // 验证两次密码是否一致
        if (password !== confirmPassword) {
            showError('两次输入的密码不一致');
            return;
        }
        
        // 显示加载状态
        const submitBtn = registerForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '注册中...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    confirmPassword: confirmPassword,
                    name: name
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // 注册成功，显示成功消息并跳转
                showSuccess('注册成功！正在跳转...');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                // 注册失败，显示错误信息
                showError(data.error || '注册失败，请重试');
            }
        } catch (error) {
            console.error('注册错误:', error);
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
        successMessage.style.display = 'none';
    }
    
    // 显示成功信息
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
    
    // 检查登录状态
    async function checkLoginStatus() {
        try {
            const response = await fetch('/api/user/info', {
                credentials: 'same-origin'
            });
            if (response.ok) {
                // 已登录，跳转到首页（只跳转一次，避免循环）
                if (window.location.pathname === '/register') {
                    window.location.href = '/';
                }
            }
            // 如果未登录（401或其他错误），继续显示注册页面，不做任何操作
            // 这是正常情况，不需要处理
        } catch (error) {
            // 网络错误时，继续显示注册页面
            // 不进行任何跳转操作，也不显示错误
        }
    }
});

