/**
 * Класс для работы с SeaTable API с авторизацией через email
 */
class SeaTableAPI {
  constructor(serverUrl, auth) {
    this.serverUrl = serverUrl;
    this.auth = auth;
    this.baseId = null;
    this.tableName = 'phones';
    this.workspaceId = null;
  }

  /**
   * Получение списка доступных баз данных
   */
  async getBases() {
    try {
      const token = this.auth.getToken();
      if (!token) throw new Error('Не авторизован');

      const response = await fetch(`${this.serverUrl}/api/v1/dtables/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log('📚 Доступные базы:', data);

      return data;
    } catch (error) {
      console.error('Ошибка получения списка баз:', error);
      return [];
    }
  }

  /**
   * Выбор базы данных по имени или ID
   */
  async selectBase(baseIdOrName) {
    const bases = await this.getBases();

    // Ищем базу по ID или имени
    let selectedBase = bases.find(b =>
      b.id === baseIdOrName ||
      b.name === baseIdOrName ||
      b.uuid === baseIdOrName
    );

    if (!selectedBase && bases.length > 0) {
      // Если не нашли, берем первую доступную
      selectedBase = bases[0];
      console.log(`⚠️ База "${baseIdOrName}" не найдена, использую: ${selectedBase.name}`);
    }

    if (selectedBase) {
      this.baseId = selectedBase.id || selectedBase.uuid;
      this.baseName = selectedBase.name;
      console.log(`✅ Выбрана база: ${this.baseName} (${this.baseId})`);
      return selectedBase;
    }

    return null;
  }

  /**
   * Получение списка таблиц в базе
   */
  async getTables() {
    try {
      const token = this.auth.getToken();
      if (!token) throw new Error('Не авторизован');
      if (!this.baseId) throw new Error('База не выбрана');

      const response = await fetch(`${this.serverUrl}/api/v1/dtables/${this.baseId}/tables/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log('📊 Таблицы в базе:', data);

      return data;
    } catch (error) {
      console.error('Ошибка получения списка таблиц:', error);
      return [];
    }
  }

  /**
   * Выбор таблицы
   */
  async selectTable(tableName) {
    const tables = await this.getTables();

    let selectedTable = tables.find(t => t.name === tableName);

    if (!selectedTable && tables.length > 0) {
      selectedTable = tables[0];
      console.log(`⚠️ Таблица "${tableName}" не найдена, использую: ${selectedTable.name}`);
    }

    if (selectedTable) {
      this.tableName = selectedTable.name;
      this.tableId = selectedTable.id;
      console.log(`✅ Выбрана таблица: ${this.tableName}`);
      return selectedTable;
    }

    return null;
  }

  /**
   * Получение всех записей из таблицы
   */
  async getAllRows() {
    try {
      const token = this.auth.getToken();
      if (!token) throw new Error('Не авторизован');
      if (!this.baseId) throw new Error('База не выбрана');

      // Пробуем разные эндпоинты
      const endpoints = [
        `${this.serverUrl}/api/v1/dtables/${this.baseId}/rows/`,
        `${this.serverUrl}/dtable-server/api/v1/dtables/${this.baseId}/rows/`,
        `${this.serverUrl}/dtable-db/api/v1/sql/`
      ];

      for (const url of endpoints) {
        try {
          let response;

          if (url.includes('/sql/')) {
            // SQL эндпоинт
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                sql: `SELECT * FROM ${this.tableName}`
              })
            });
          } else {
            // REST эндпоинт
            response = await fetch(url, {
              headers: {
                'Authorization': `Token ${token}`,
                'Accept': 'application/json'
              }
            });
          }

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Данные получены через ${url}`);

            // Извлекаем строки в зависимости от формата ответа
            const rows = data.rows || data.results || data;
            return rows.map(row => this.mapRowToEmployee(row));
          }
        } catch (e) {
          console.log(`⚠️ Эндпоинт ${url} не работает:`, e.message);
        }
      }

      throw new Error('Не удалось получить данные');

    } catch (error) {
      console.error('Ошибка получения записей:', error);
      return [];
    }
  }

  /**
   * Добавление новой записи
   */
  async addRow(rowData) {
    try {
      const token = this.auth.getToken();
      if (!token) throw new Error('Не авторизован');
      if (!this.baseId) throw new Error('База не выбрана');

      const response = await fetch(`${this.serverUrl}/api/v1/dtables/${this.baseId}/rows/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table_name: this.tableName,
          row: this.mapEmployeeToRow(rowData)
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      console.log('✅ Запись добавлена:', result);
      return result;

    } catch (error) {
      console.error('Ошибка добавления записи:', error);
      throw error;
    }
  }

  /**
   * Обновление записи
   */
  async updateRow(rowId, rowData) {
    try {
      const token = this.auth.getToken();
      if (!token) throw new Error('Не авторизован');
      if (!this.baseId) throw new Error('База не выбрана');

      const response = await fetch(`${this.serverUrl}/api/v1/dtables/${this.baseId}/rows/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table_name: this.tableName,
          row_id: rowId,
          row: this.mapEmployeeToRow(rowData)
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      console.log('✅ Запись обновлена:', result);
      return result;

    } catch (error) {
      console.error('Ошибка обновления записи:', error);
      throw error;
    }
  }

  /**
   * Удаление записи
   */
  async deleteRow(rowId) {
    try {
      const token = this.auth.getToken();
      if (!token) throw new Error('Не авторизован');
      if (!this.baseId) throw new Error('База не выбрана');

      const response = await fetch(`${this.serverUrl}/api/v1/dtables/${this.baseId}/rows/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table_name: this.tableName,
          row_ids: [rowId]
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      console.log('✅ Запись удалена');
      return true;

    } catch (error) {
      console.error('Ошибка удаления записи:', error);
      throw error;
    }
  }

  /**
   * Преобразование строки SeaTable в формат сотрудника
   */
  mapRowToEmployee(row) {
    return {
      id: row._id || row.id,
      seatableRowId: row._id || row.id,
      name: row['ФИО'] || row['name'] || '',
      position: row['Должность'] || row['position'] || '',
      phone: row['Телефон'] || row['phone'] || '',
      internalPhone: row['Внутренний номер'] || row['internal_phone'] || '',
      email: row['Email'] || row['email'] || '',
      legalEntity: row['Юридическое лицо'] || row['legal_entity'] || '',
      structuralUnit: row['Структурное подразделение'] || row['structural_unit'] || '',
      sector: row['Отдел/Сектор'] || row['sector'] || '',
      office: row['Кабинет'] || row['office'] || '',
      workHours: row['Часы работы'] || row['work_hours'] || '',
      additional: row['Дополнительно'] || row['additional'] || '',
      isActive: row['Активен'] !== false,
      updatedAt: row['_mtime'] || new Date().toISOString()
    };
  }

  /**
   * Преобразование сотрудника в формат SeaTable
   */
  mapEmployeeToRow(employee) {
    return {
      'ФИО': employee.name,
      'Должность': employee.position,
      'Телефон': employee.phone,
      'Внутренний номер': employee.internalPhone || '',
      'Email': employee.email || '',
      'Юридическое лицо': employee.legalEntity || '',
      'Структурное подразделение': employee.structuralUnit || '',
      'Отдел/Сектор': employee.sector || '',
      'Кабинет': employee.office || '',
      'Часы работы': employee.workHours || '',
      'Дополнительно': employee.additional || '',
      'Активен': employee.isActive !== false
    };
  }
}