// auth.js - Система авторизации и управления пользователями

class AuthSystem {
    constructor(db) {
        this.db = db;
        this.currentUser = null;
    }

    async init() {
        await this.initDefaultUsers();
        await this.loadCurrentUser();
    }

    async initDefaultUsers() {
        try {
            const users = await this.db.getAllUsers();
            
            if (!users || users.length === 0) {
                console.log('Создание пользователей по умолчанию...');
                
                // Создаем администратора по умолчанию
                const adminUser = {
                    username: 'admin',
                    password: this.hashPassword('admin123'),
                    fullName: 'Администратор системы',
                    email: 'admin@example.com',
                    role: 'admin',
                    active: true,
                    _created: new Date().toISOString()
                };
                await this.db.addUser(adminUser);
                console.log('Создан пользователь admin (пароль: admin123)');
                
                // Создаем редактора по умолчанию
                const editorUser = {
                    username: 'editor',
                    password: this.hashPassword('editor123'),
                    fullName: 'Редактор справочника',
                    email: 'editor@example.com',
                    role: 'editor',
                    active: true,
                    _created: new Date().toISOString()
                };
                await this.db.addUser(editorUser);
                console.log('Создан пользователь editor (пароль: editor123)');
                
                // Создаем наблюдателя по умолчанию
                const viewerUser = {
                    username: 'viewer',
                    password: this.hashPassword('viewer123'),
                    fullName: 'Наблюдатель',
                    email: 'viewer@example.com',
                    role: 'viewer',
                    active: true,
                    _created: new Date().toISOString()
                };
                await this.db.addUser(viewerUser);
                console.log('Создан пользователь viewer (пароль: viewer123)');
            }
        } catch (error) {
            console.error('Ошибка при создании пользователей по умолчанию:', error);
        }
    }

    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    async login(username, password) {
        try {
            const users = await this.db.getAllUsers();
            const hashedPassword = this.hashPassword(password);
            
            const user = users.find(u => 
                u.username === username && 
                u.password === hashedPassword && 
                u.active === true
            );
            
            if (user) {
                this.currentUser = {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role
                };
                
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                await this.addToHistory('login', `Пользователь ${username} вошел в систему`);
                
                return { success: true, user: this.currentUser };
            }
            
            return { success: false, error: 'Неверное имя пользователя или пароль' };
        } catch (error) {
            console.error('Ошибка входа:', error);
            return { success: false, error: 'Ошибка при входе в систему' };
        }
    }

    async logout() {
        if (this.currentUser) {
            await this.addToHistory('logout', `Пользователь ${this.currentUser.username} вышел из системы`);
        }
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    async loadCurrentUser() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            return this.currentUser;
        }
        return null;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    isEditor() {
        return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'editor');
    }

    isViewer() {
        return this.isAuthenticated();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async changePassword(username, oldPassword, newPassword) {
        try {
            if (newPassword.length < 4) {
                return { success: false, error: 'Новый пароль должен содержать минимум 4 символа' };
            }
            
            const users = await this.db.getAllUsers();
            const user = users.find(u => u.username === username);
            
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }
            
            if (user.password !== this.hashPassword(oldPassword)) {
                return { success: false, error: 'Неверный текущий пароль' };
            }
            
            user.password = this.hashPassword(newPassword);
            user._updated = new Date().toISOString();
            await this.db.updateUser(user.id, user);
            
            await this.addToHistory('change_password', `Пользователь ${username} сменил пароль`);
            
            return { success: true };
        } catch (error) {
            console.error('Ошибка смены пароля:', error);
            return { success: false, error: 'Ошибка при смене пароля' };
        }
    }

    async getAllUsers() {
        if (!this.isAdmin()) {
            return { success: false, error: 'Недостаточно прав' };
        }
        
        try {
            const users = await this.db.getAllUsers();
            const safeUsers = users.map(user => ({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                active: user.active,
                _created: user._created
            }));
            return { success: true, users: safeUsers };
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            return { success: false, error: 'Ошибка получения списка пользователей' };
        }
    }

    async addUser(userData) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Недостаточно прав' };
        }
        
        try {
            const existingUsers = await this.db.getAllUsers();
            if (existingUsers.find(u => u.username === userData.username)) {
                return { success: false, error: 'Пользователь с таким логином уже существует' };
            }
            
            const newUser = {
                username: userData.username,
                password: this.hashPassword(userData.password),
                fullName: userData.fullName || '',
                email: userData.email || '',
                role: userData.role || 'viewer',
                active: userData.active !== false,
                _created: new Date().toISOString()
            };
            
            const result = await this.db.addUser(newUser);
            
            await this.addToHistory('add_user', `Администратор добавил пользователя ${userData.username}`);
            
            return { success: true, user: result };
        } catch (error) {
            console.error('Ошибка добавления пользователя:', error);
            return { success: false, error: 'Ошибка при добавлении пользователя' };
        }
    }

    async updateUser(userId, userData) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Недостаточно прав' };
        }
        
        try {
            const users = await this.db.getAllUsers();
            const existingUser = users.find(u => u.id === userId);
            
            if (!existingUser) {
                return { success: false, error: 'Пользователь не найден' };
            }
            
            const updatedUser = {
                ...existingUser,
                fullName: userData.fullName || existingUser.fullName,
                email: userData.email || existingUser.email,
                role: userData.role || existingUser.role,
                active: userData.active !== undefined ? userData.active : existingUser.active,
                _updated: new Date().toISOString()
            };
            
            if (userData.password && userData.password.length >= 4) {
                updatedUser.password = this.hashPassword(userData.password);
            }
            
            await this.db.updateUser(userId, updatedUser);
            
            await this.addToHistory('update_user', `Администратор обновил данные пользователя ${existingUser.username}`);
            
            return { success: true };
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            return { success: false, error: 'Ошибка при обновлении пользователя' };
        }
    }

    async deleteUser(userId) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Недостаточно прав' };
        }
        
        try {
            const users = await this.db.getAllUsers();
            const userToDelete = users.find(u => u.id === userId);
            
            if (!userToDelete) {
                return { success: false, error: 'Пользователь не найден' };
            }
            
            if (this.currentUser && this.currentUser.id === userId) {
                return { success: false, error: 'Нельзя удалить свою учетную запись' };
            }
            
            await this.db.deleteUser(userId);
            
            await this.addToHistory('delete_user', `Администратор удалил пользователя ${userToDelete.username}`);
            
            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            return { success: false, error: 'Ошибка при удалении пользователя' };
        }
    }

    async toggleUserStatus(userId) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Недостаточно прав' };
        }
        
        try {
            const users = await this.db.getAllUsers();
            const user = users.find(u => u.id === userId);
            
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }
            
            user.active = !user.active;
            await this.db.updateUser(userId, user);
            
            const status = user.active ? 'разблокировал' : 'заблокировал';
            await this.addToHistory('toggle_user', `Администратор ${status} пользователя ${user.username}`);
            
            return { success: true, active: user.active };
        } catch (error) {
            console.error('Ошибка изменения статуса пользователя:', error);
            return { success: false, error: 'Ошибка при изменении статуса' };
        }
    }

    async addToHistory(action, description) {
        try {
            const history = {
                action: action,
                description: description,
                user: this.currentUser ? this.currentUser.username : 'system',
                timestamp: new Date().toISOString()
            };
            
            if (this.db && this.db.addHistory) {
                await this.db.addHistory(history);
            }
            
            console.log(`[HISTORY] ${action}: ${description}`);
        } catch (error) {
            console.error('Ошибка записи в историю:', error);
        }
    }

    canEdit() {
        return this.isEditor();
    }

    canDelete() {
        return this.isAdmin();
    }

    canManageUsers() {
        return this.isAdmin();
    }

    canViewAdminPanel() {
        return this.isAuthenticated();
    }
}

// ========== КЛАСС LOGIN MODAL ==========

class LoginModal {
    constructor(authSystem) {
        this.authSystem = authSystem;
        this.modal = document.getElementById('loginModal');
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('loginUsername');
        this.passwordInput = document.getElementById('loginPassword');
        this.errorDiv = document.getElementById('loginError');
        this.cancelBtn = document.getElementById('cancelLogin');
        
        this.init();
    }

    init() {
        if (!this.modal) {
            console.error('Модальное окно авторизации не найдено');
            return;
        }

        // Закрытие по клику вне окна
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Обработчик формы
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Кнопка отмены
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.hide());
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const username = this.usernameInput?.value.trim();
        const password = this.passwordInput?.value;
        
        if (!username || !password) {
            this.showError('Введите имя пользователя и пароль');
            return;
        }
        
        try {
            const result = await this.authSystem.login(username, password);
            
            if (result.success) {
                this.hide();
                this.clearForm();
                
                // Обновляем интерфейс
                if (window.app) {
                    await window.app.loadEmployees();
                }
                
                // Показываем уведомление
                this.showNotification(`Добро пожаловать, ${result.user.fullName || result.user.username}!`, 'success');
            } else {
                this.showError(result.error || 'Ошибка авторизации');
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            this.showError('Произошла ошибка при входе в систему');
        }
    }

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            if (this.usernameInput) {
                this.usernameInput.focus();
            }
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.clearForm();
    }

    clearForm() {
        if (this.usernameInput) this.usernameInput.value = '';
        if (this.passwordInput) this.passwordInput.value = '';
        this.hideError();
    }

    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.display = 'block';
        }
    }

    hideError() {
        if (this.errorDiv) {
            this.errorDiv.style.display = 'none';
            this.errorDiv.textContent = '';
        }
    }

    showNotification(message, type = 'info') {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Добавляем стили для уведомлений (если их нет в CSS)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Делаем классы доступными глобально
if (typeof window !== 'undefined') {
    window.AuthSystem = AuthSystem;
    window.LoginModal = LoginModal;
}

// Экспорт для модульной системы
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthSystem, LoginModal };
}