class SeaTableAPI {
  constructor(config) {
    this.serverUrl = config.serverUrl;
    this.apiToken = config.apiToken;
    this.baseId = config.baseId;
    this.tableName = config.tableName;

    // Определяем версию API (пробуем оба варианта)
    this.apiUrl = `${this.serverUrl}/api/v1`;
    this.dtableDbUrl = `${this.serverUrl}/dtable-db/api/v1`; // может не работать
    this.dtableServerUrl = `${this.serverUrl}/dtable-server/api/v1`; // альтернатива
  }

  async testConnection() {
    // Сначала проверим базовый эндпоинт
    try {
      const response = await fetch(`${this.apiUrl}/dtables/`, {
        headers: { 'Authorization': `Token ${this.apiToken}` }
      });
      if (response.ok) {
        console.log('✅ API v1 работает');
        this.activeApi = 'v1';
        return true;
      }
    } catch (e) { console.log('API v1 не доступен'); }

    // Проверим альтернативный эндпоинт
    try {
      const response = await fetch(`${this.dtableServerUrl}/dtables/${this.baseId}/`, {
        headers: { 'Authorization': `Token ${this.apiToken}` }
      });
      if (response.ok) {
        console.log('✅ dtable-server API работает');
        this.activeApi = 'dtable-server';
        return true;
      }
    } catch (e) { console.log('dtable-server не доступен'); }

    console.error('❌ Не удалось подключиться к SeaTable API');
    return false;
  }

  // Остальные методы должны использовать this.activeApi для выбора правильного URL
}