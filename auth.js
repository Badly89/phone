/**
 * Класс для управления авторизацией и пользователями
 */
class AuthSystem {
  constructor(db) {
    this.db = db;
    this.currentUser = null;
    this.sessionKey = 'city_admin_session';
  }

  /**
   * Инициализация системы авторизации
   */
  async init() {
    await this.db.init();
    await this.initDefaultUsers();
    await this.checkSession();
  }

  /**
   * Создание пользователей по умолчанию при первом запуске
   */
  async initDefaultUsers() {
    const users = await this.db.getAllUsers();
    if (users.length === 0) {
      console.log('Создание пользователей по умолчанию...');

      // 1. Администратор - полный доступ
      await this.db.addUser({
        username: 'admin',
        password: await this.hashPassword('admin123'),
        role: 'admin',
        fullName: 'Главный администратор',
        email: 'admin@cityadmin.ru',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // 2. Редактор - может редактировать справочник
      await this.db.addUser({
        username: 'editor',
        password: await this.hashPassword('editor123'),
        role: 'editor',
        fullName: 'Редактор справочника',
        email: 'editor@cityadmin.ru',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // 3. Наблюдатель - только просмотр
      await this.db.addUser({
        username: 'viewer',
        password: await this.hashPassword('viewer123'),
        role: 'viewer',
        fullName: 'Наблюдатель',
        email: 'viewer@cityadmin.ru',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      console.log('Пользователи по умолчанию созданы:');
      console.log('  admin / admin123 - Администратор');
      console.log('  editor / editor123 - Редактор');
      console.log('  viewer / viewer123 - Наблюдатель');
    }
  }

  /**
   * Хеширование пароля (SHA-256)
   * @param {string} password - пароль в открытом виде
   * @returns {Promise<string>} - хеш пароля
   */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Вход в систему
   * @param {string} username - имя пользователя
   * @param {string} password - пароль
   * @returns {Promise<Object>} - результат авторизации
   */
  async login(username, password) {
    try {
      // Ищем пользователя
      const user = await this.db.getUserByUsername(username);

      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Учетная запись заблокирована' };
      }

      // Проверяем пароль
      const hashedPassword = await this.hashPassword(password);

      if (user.password !== hashedPassword) {
        return { success: false, message: 'Неверный пароль' };
      }

      // Сохраняем сессию
      this.currentUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email
      };

      // Сохраняем в localStorage (24 часа)
      localStorage.setItem(this.sessionKey, JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        expires: Date.now() + 24 * 60 * 60 * 1000
      }));

      await this.db.addHistory('login', `Пользователь ${username} вошел в систему`);

      console.log(`Пользователь ${username} успешно вошел в систему`);
      return { success: true, user: this.currentUser };

    } catch (error) {
      console.error('Ошибка входа:', error);
      return { success: false, message: 'Ошибка авторизации' };
    }
  }

  /**
   * Выход из системы
   */
  async logout() {
    if (this.currentUser) {
      await this.db.addHistory('logout', `Пользователь ${this.currentUser.username} вышел из системы`);
      console.log(`Пользователь ${this.currentUser.username} вышел из системы`);
    }
    this.currentUser = null;
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * Проверка активной сессии
   * @returns {Promise<boolean>} - есть ли активная сессия
   */
  async checkSession() {
    const session = localStorage.getItem(this.sessionKey);
    if (!session) return false;

    try {
      const sessionData = JSON.parse(session);

      // Проверяем срок действия
      if (sessionData.expires < Date.now()) {
        localStorage.removeItem(this.sessionKey);
        return false;
      }

      // Получаем актуальные данные пользователя
      const user = await this.db.getUserById(sessionData.userId);

      if (user && user.isActive) {
        this.currentUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          email: user.email
        };
        console.log(`Сессия восстановлена для пользователя ${user.username}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка проверки сессии:', error);
      return false;
    }
  }

  /**
   * Проверка прав доступа
   * @param {string} requiredRole - требуемая роль ('admin', 'editor', 'viewer')
   * @returns {boolean} - есть ли доступ
   */
  hasPermission(requiredRole) {
    if (!this.currentUser) return false;

    // Определяем уровень доступа
    const roles = {
      'admin': 3,
      'editor': 2,
      'viewer': 1
    };

    const userLevel = roles[this.currentUser.role] || 0;
    const requiredLevel = roles[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Может ли пользователь редактировать
   * @returns {boolean}
   */
  canEdit() {
    return this.hasPermission('editor');
  }

  /**
   * Может ли пользователь управлять пользователями
   * @returns {boolean}
   */
  canManageUsers() {
    return this.hasPermission('admin');
  }

  /**
   * Получение текущего пользователя
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Смена пароля
   * @param {number} userId - ID пользователя
   * @param {string} oldPassword - старый пароль
   * @param {string} newPassword - новый пароль
   * @returns {Promise<Object>} - результат операции
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await this.db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      // Проверяем старый пароль
      const hashedOld = await this.hashPassword(oldPassword);
      if (user.password !== hashedOld) {
        return { success: false, message: 'Неверный текущий пароль' };
      }

      // Устанавливаем новый пароль
      user.password = await this.hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
      await this.db.updateUser(user);

      await this.db.addHistory('change_password', `Пользователь ${user.username} изменил пароль`);

      return { success: true, message: 'Пароль успешно изменен' };
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      return { success: false, message: 'Ошибка при смене пароля' };
    }
  }
}

/**
 * Модальное окно авторизации
 */
class LoginModal {
  constructor(authSystem) {
    this.auth = authSystem;
    this.modal = null;
    this.loginForm = null;
    this.createModal();
    this.bindEvents();
  }

  /**
   * Создание HTML структуры модального окна
   */
  createModal() {
    // Проверяем, существует ли уже модальное окно
    if (document.getElementById('loginModal')) {
      this.modal = document.getElementById('loginModal');
      this.loginForm = document.getElementById('loginForm');
      this.loginError = document.getElementById('loginError');
      this.cancelBtn = document.getElementById('cancelLogin');
      return;
    }

    const modalHTML = `
            <div id="loginModal" class="modal login-modal">
                <div class="modal-content login-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-lock"></i> Авторизация</h2>
                        <button class="modal-close login-modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="loginForm">
                            <div class="form-group">
                                <label><i class="fas fa-user"></i> Имя пользователя</label>
                                <input type="text" id="loginUsername" required 
                                       placeholder="Введите имя пользователя" autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-key"></i> Пароль</label>
                                <input type="password" id="loginPassword" required 
                                       placeholder="Введите пароль">
                            </div>
                            <div id="loginError" class="error-message" style="display: none;"></div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-sign-in-alt"></i> Войти
                                </button>
                                <button type="button" id="cancelLogin" class="btn-secondary">
                                    <i class="fas fa-times"></i> Отмена
                                </button>
                            </div>
                        </form>
                        <div class="demo-credentials" style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 12px;">
                            <p><strong>📝 Тестовые учетные записи:</strong></p>
                            <p>👑 <strong>admin</strong> / admin123 - Администратор (полный доступ)</p>
                            <p>✏️ <strong>editor</strong> / editor123 - Редактор (может редактировать)</p>
                            <p>👁️ <strong>viewer</strong> / viewer123 - Наблюдатель (только просмотр)</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    this.modal = document.getElementById('loginModal');
    this.loginForm = document.getElementById('loginForm');
    this.loginError = document.getElementById('loginError');
    this.cancelBtn = document.getElementById('cancelLogin');

    // Добавляем обработчик для кнопки закрытия
    const closeBtn = document.querySelector('.login-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * Привязка обработчиков событий
   */
  bindEvents() {
    if (!this.loginForm) return;

    this.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.close());
    }

    // Закрытие по клику вне модалки
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display === 'block') {
        this.close();
      }
    });
  }

  /**
       * Обработка отправки формы
       */
  async handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
      this.showError('Заполните все поля');
      return;
    }

    // Показываем индикатор загрузки
    const submitBtn = this.loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Вход...';
    submitBtn.disabled = true;

    try {
      const result = await this.auth.login(username, password);

      if (result.success) {
        this.close();
        // Обновляем интерфейс
        if (window.adminPanel) {
          window.adminPanel.updateUserInfo();
          await window.adminPanel.openAdminPanel();
        }
        if (window.app) {
          window.app.updateUIForUser();
        }
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      this.showError('Произошла ошибка при входе');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  /**
   * Показ сообщения об ошибке
   */
  showError(message) {
    if (this.loginError) {
      this.loginError.textContent = message;
      this.loginError.style.display = 'block';

      // Автоматически скрываем через 3 секунды
      setTimeout(() => {
        if (this.loginError) {
          this.loginError.style.display = 'none';
        }
      }, 3000);
    }
  }

  /**
     * Открытие модального окна
     */
  open() {
    if (this.modal) {
      this.modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
      const usernameInput = document.getElementById('loginUsername');
      if (usernameInput) {
        setTimeout(() => usernameInput.focus(), 100);
      }
      console.log('Модальное окно авторизации открыто');
    } else {
      console.error('Модальное окно авторизации не найдено');
      // Попробуем создать заново
      this.createModal();
      this.bindEvents();
      if (this.modal) {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
      }
    }
  }

  /**
   * Закрытие модального окна
   */
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
      if (this.loginForm) {
        this.loginForm.reset();
      }
      if (this.loginError) {
        this.loginError.style.display = 'none';
      }
      console.log('Модальное окно авторизации закрыто');
    }
  }
}
// Убедимся, что классы экспортируются в глобальную область
if (typeof window !== 'undefined') {
  window.AuthSystem = AuthSystem;
  window.LoginModal = LoginModal;
}