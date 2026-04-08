/**
 * Авторизация в SeaTable через email/пароль
 */
class SeaTableAuth {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.apiToken = null;
    this.userInfo = null;
  }

  /**
   * Вход в SeaTable с email и паролем
   */
  async login(email, password) {
    try {
      console.log('🔐 Попытка входа в SeaTable...');

      const response = await fetch(`${this.serverUrl}/api/v1/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,  // или email, в зависимости от версии
          password: password
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка авторизации: ${response.status} - ${error}`);
      }

      const data = await response.json();

      // Сохраняем токен (может быть в разных полях)
      this.apiToken = data.token || data.access_token || data.api_token;
      this.userInfo = data.user || data;

      console.log('✅ Успешный вход в SeaTable');
      console.log('Пользователь:', this.userInfo.email || this.userInfo.username);

      // Сохраняем токен в localStorage
      localStorage.setItem('seatable_token', this.apiToken);
      localStorage.setItem('seatable_user', JSON.stringify(this.userInfo));

      return {
        success: true,
        token: this.apiToken,
        user: this.userInfo
      };

    } catch (error) {
      console.error('❌ Ошибка входа в SeaTable:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Проверка текущей сессии
   */
  async checkSession() {
    const savedToken = localStorage.getItem('seatable_token');
    if (!savedToken) return false;

    this.apiToken = savedToken;

    try {
      // Проверяем, активен ли токен
      const response = await fetch(`${this.serverUrl}/api/v1/auth/user/`, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const user = await response.json();
        this.userInfo = user;
        console.log('✅ Сессия SeaTable активна, пользователь:', user.email);
        return true;
      } else {
        console.log('⚠️ Сессия SeaTable истекла');
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Ошибка проверки сессии:', error);
      return false;
    }
  }

  /**
   * Выход из SeaTable
   */
  logout() {
    this.apiToken = null;
    this.userInfo = null;
    localStorage.removeItem('seatable_token');
    localStorage.removeItem('seatable_user');
    console.log('👋 Выход из SeaTable');
  }

  /**
   * Получение токена для API запросов
   */
  getToken() {
    return this.apiToken;
  }
}