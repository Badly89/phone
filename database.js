/**
 * Класс для работы с IndexedDB - NoSQL базой данных в браузере
 * Версия 3 - добавлены хранилища для юридических лиц, структурных подразделений и секторов
 */
class EmployeeDatabase {
  constructor() {
    this.dbName = 'CityAdministrationDB';
    this.dbVersion = 3;  // Текущая версия базы данных
    this.db = null;
  }

  /**
   * Инициализация базы данных
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Ошибка открытия базы данных:', request.error);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('База данных успешно открыта, версия:', this.dbVersion);
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        console.log(`Обновление структуры базы данных с версии ${oldVersion} до ${this.dbVersion}...`);

        // Версия 1: базовые хранилища
        if (oldVersion < 1) {
          console.log('Создание хранилищ версии 1...');

          // Хранилище для сотрудников
          const employeeStore = db.createObjectStore('employees', {
            keyPath: 'id',
            autoIncrement: true
          });
          employeeStore.createIndex('name', 'name', { unique: false });
          employeeStore.createIndex('department', 'department', { unique: false });
          employeeStore.createIndex('position', 'position', { unique: false });
          employeeStore.createIndex('phone', 'phone', { unique: false });

          // Хранилище для отделов
          const departmentStore = db.createObjectStore('departments', {
            keyPath: 'id',
            autoIncrement: true
          });
          departmentStore.createIndex('name', 'name', { unique: true });

          // Хранилище для пользователей
          const userStore = db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true
          });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: false });
          userStore.createIndex('role', 'role', { unique: false });

          // Хранилище для настроек
          db.createObjectStore('settings', { keyPath: 'key' });

          // Хранилище для истории
          const historyStore = db.createObjectStore('history', {
            keyPath: 'id',
            autoIncrement: true
          });
          historyStore.createIndex('date', 'date', { unique: false });
          historyStore.createIndex('action', 'action', { unique: false });
        }

        // Версия 2: добавляем новые индексы для сотрудников
        if (oldVersion < 2) {
          console.log('Обновление до версии 2...');

          const transaction = event.target.transaction;
          const employeeStore = transaction.objectStore('employees');

          // Добавляем новые индексы
          const newIndexes = [
            'sector', 'legalEntity', 'internalPhone',
            'structuralUnit', 'legalEntityId', 'structuralUnitId', 'sectorId'
          ];

          newIndexes.forEach(indexName => {
            if (!employeeStore.indexNames.contains(indexName)) {
              employeeStore.createIndex(indexName, indexName, { unique: false });
              console.log(`  Добавлен индекс: ${indexName}`);
            }
          });
        }

        // Версия 3: добавляем новые хранилища
        if (oldVersion < 3) {
          console.log('Обновление до версии 3 - создание новых хранилищ...');

          // Создаем хранилище для структурных подразделений
          if (!db.objectStoreNames.contains('structuralUnits')) {
            const unitStore = db.createObjectStore('structuralUnits', {
              keyPath: 'id',
              autoIncrement: true
            });
            unitStore.createIndex('name', 'name', { unique: true });
            unitStore.createIndex('parentId', 'parentId', { unique: false });
            console.log('  ✓ Хранилище structuralUnits создано');
          }

          // Создаем хранилище для юридических лиц
          if (!db.objectStoreNames.contains('legalEntities')) {
            const legalStore = db.createObjectStore('legalEntities', {
              keyPath: 'id',
              autoIncrement: true
            });
            legalStore.createIndex('name', 'name', { unique: true });
            legalStore.createIndex('inn', 'inn', { unique: true });
            legalStore.createIndex('ogrn', 'ogrn', { unique: false });
            console.log('  ✓ Хранилище legalEntities создано');
          }

          // Создаем хранилище для секторов/отделов
          if (!db.objectStoreNames.contains('sectors')) {
            const sectorStore = db.createObjectStore('sectors', {
              keyPath: 'id',
              autoIncrement: true
            });
            sectorStore.createIndex('name', 'name', { unique: false });
            sectorStore.createIndex('structuralUnitId', 'structuralUnitId', { unique: false });
            console.log('  ✓ Хранилище sectors создано');
          }
        }

        console.log('Структура базы данных обновлена успешно');
      };
    });
  }

  // ========== РАБОТА С СОТРУДНИКАМИ ==========

  async addEmployee(employee) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['employees', 'history'], 'readwrite');
      const store = transaction.objectStore('employees');

      employee.createdAt = new Date().toISOString();
      employee.updatedAt = new Date().toISOString();

      const request = store.add(employee);

      request.onsuccess = () => {
        this.addHistory('add', `Добавлен сотрудник: ${employee.name}`);
        console.log(`Сотрудник "${employee.name}" добавлен с ID: ${request.result}`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Ошибка добавления сотрудника:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllEmployees() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['employees'], 'readonly');
      const store = transaction.objectStore('employees');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Ошибка получения сотрудников:', request.error);
        reject(request.error);
      };
    });
  }

  async getEmployeeById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['employees'], 'readonly');
      const store = transaction.objectStore('employees');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateEmployee(employee) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['employees', 'history'], 'readwrite');
      const store = transaction.objectStore('employees');

      employee.updatedAt = new Date().toISOString();

      const request = store.put(employee);

      request.onsuccess = () => {
        this.addHistory('update', `Обновлен сотрудник: ${employee.name}`);
        console.log(`Сотрудник "${employee.name}" обновлен`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Ошибка обновления сотрудника:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteEmployee(id, name) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['employees', 'history'], 'readwrite');
      const store = transaction.objectStore('employees');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.addHistory('delete', `Удален сотрудник: ${name || id}`);
        console.log(`Сотрудник "${name}" удален`);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Ошибка удаления сотрудника:', request.error);
        reject(request.error);
      };
    });
  }

  // ========== РАБОТА С ОТДЕЛАМИ (устаревшие отделы) ==========

  async addDepartment(department) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['departments', 'history'], 'readwrite');
      const store = transaction.objectStore('departments');

      const request = store.add({
        name: department,
        createdAt: new Date().toISOString()
      });

      request.onsuccess = () => {
        this.addHistory('add_department', `Добавлен отдел: ${department}`);
        console.log(`Отдел "${department}" добавлен`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Ошибка добавления отдела:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllDepartments() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['departments'], 'readonly');
      const store = transaction.objectStore('departments');
      const request = store.getAll();

      request.onsuccess = () => {
        const departments = request.result.map(dept => dept.name).sort();
        resolve(departments);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ========== РАБОТА СО СТРУКТУРНЫМИ ПОДРАЗДЕЛЕНИЯМИ ==========

  async addStructuralUnit(unit) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['structuralUnits', 'history'], 'readwrite');
      const store = transaction.objectStore('structuralUnits');

      unit.createdAt = new Date().toISOString();
      unit.updatedAt = new Date().toISOString();

      const request = store.add(unit);

      request.onsuccess = () => {
        this.addHistory('add_unit', `Добавлено структурное подразделение: ${unit.name}`);
        console.log(`Структурное подразделение "${unit.name}" добавлено`);
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllStructuralUnits() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['structuralUnits'], 'readonly');
      const store = transaction.objectStore('structuralUnits');
      const request = store.getAll();

      request.onsuccess = () => {
        const units = request.result.sort((a, b) => a.name.localeCompare(b.name));
        resolve(units);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStructuralUnitById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['structuralUnits'], 'readonly');
      const store = transaction.objectStore('structuralUnits');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateStructuralUnit(unit) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['structuralUnits', 'history'], 'readwrite');
      const store = transaction.objectStore('structuralUnits');

      unit.updatedAt = new Date().toISOString();

      const request = store.put(unit);

      request.onsuccess = () => {
        this.addHistory('update_unit', `Обновлено структурное подразделение: ${unit.name}`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStructuralUnit(id, name) {
    return new Promise(async (resolve, reject) => {
      // Проверяем, есть ли сотрудники в этом подразделении
      const employees = await this.getAllEmployees();
      const hasEmployees = employees.some(emp => emp.structuralUnitId === id);
      if (hasEmployees) {
        reject(new Error('Невозможно удалить подразделение, в котором есть сотрудники'));
        return;
      }

      const transaction = this.db.transaction(['structuralUnits', 'history'], 'readwrite');
      const store = transaction.objectStore('structuralUnits');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.addHistory('delete_unit', `Удалено структурное подразделение: ${name}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== РАБОТА С ЮРИДИЧЕСКИМИ ЛИЦАМИ ==========

  async addLegalEntity(entity) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['legalEntities', 'history'], 'readwrite');
      const store = transaction.objectStore('legalEntities');

      entity.createdAt = new Date().toISOString();
      entity.updatedAt = new Date().toISOString();

      const request = store.add(entity);

      request.onsuccess = () => {
        this.addHistory('add_legal_entity', `Добавлено юр. лицо: ${entity.name}`);
        console.log(`Юридическое лицо "${entity.name}" добавлено`);
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllLegalEntities() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['legalEntities'], 'readonly');
      const store = transaction.objectStore('legalEntities');
      const request = store.getAll();

      request.onsuccess = () => {
        const entities = request.result.sort((a, b) => a.name.localeCompare(b.name));
        resolve(entities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLegalEntityById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['legalEntities'], 'readonly');
      const store = transaction.objectStore('legalEntities');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateLegalEntity(entity) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['legalEntities', 'history'], 'readwrite');
      const store = transaction.objectStore('legalEntities');

      entity.updatedAt = new Date().toISOString();

      const request = store.put(entity);

      request.onsuccess = () => {
        this.addHistory('update_legal_entity', `Обновлено юр. лицо: ${entity.name}`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLegalEntity(id, name) {
    return new Promise(async (resolve, reject) => {
      // Проверяем, есть ли сотрудники в этом юр. лице
      const employees = await this.getAllEmployees();
      const hasEmployees = employees.some(emp => emp.legalEntityId === id);
      if (hasEmployees) {
        reject(new Error('Невозможно удалить юр. лицо, у которого есть сотрудники'));
        return;
      }

      const transaction = this.db.transaction(['legalEntities', 'history'], 'readwrite');
      const store = transaction.objectStore('legalEntities');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.addHistory('delete_legal_entity', `Удалено юр. лицо: ${name}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== РАБОТА С СЕКТОРАМИ ==========

  async addSector(sector) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sectors', 'history'], 'readwrite');
      const store = transaction.objectStore('sectors');

      sector.createdAt = new Date().toISOString();
      sector.updatedAt = new Date().toISOString();

      const request = store.add(sector);

      request.onsuccess = () => {
        this.addHistory('add_sector', `Добавлен сектор/отдел: ${sector.name}`);
        console.log(`Сектор/отдел "${sector.name}" добавлен`);
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllSectors() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sectors'], 'readonly');
      const store = transaction.objectStore('sectors');
      const request = store.getAll();

      request.onsuccess = () => {
        const sectors = request.result.sort((a, b) => a.name.localeCompare(b.name));
        resolve(sectors);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSectorById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sectors'], 'readonly');
      const store = transaction.objectStore('sectors');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSectorsByStructuralUnit(unitId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sectors'], 'readonly');
      const store = transaction.objectStore('sectors');
      const index = store.index('structuralUnitId');
      const request = index.getAll(unitId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSector(sector) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sectors', 'history'], 'readwrite');
      const store = transaction.objectStore('sectors');

      sector.updatedAt = new Date().toISOString();

      const request = store.put(sector);

      request.onsuccess = () => {
        this.addHistory('update_sector', `Обновлен сектор/отдел: ${sector.name}`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSector(id, name) {
    return new Promise(async (resolve, reject) => {
      // Проверяем, есть ли сотрудники в этом секторе
      const employees = await this.getAllEmployees();
      const hasEmployees = employees.some(emp => emp.sectorId === id);
      if (hasEmployees) {
        reject(new Error('Невозможно удалить сектор, в котором есть сотрудники'));
        return;
      }

      const transaction = this.db.transaction(['sectors', 'history'], 'readwrite');
      const store = transaction.objectStore('sectors');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.addHistory('delete_sector', `Удален сектор/отдел: ${name}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========

  async addUser(user) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users', 'history'], 'readwrite');
      const store = transaction.objectStore('users');

      user.createdAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();

      const request = store.add(user);

      request.onsuccess = () => {
        this.addHistory('add_user', `Добавлен пользователь: ${user.username}`);
        console.log(`Пользователь "${user.username}" добавлен`);
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => {
        const users = request.result.map(user => {
          const { password, ...userWithoutPassword } = user;
          return { ...userWithoutPassword, hasPassword: !!user.password };
        });
        resolve(users);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('username');
      const request = index.get(username);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(user) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users', 'history'], 'readwrite');
      const store = transaction.objectStore('users');

      user.updatedAt = new Date().toISOString();

      const request = store.put(user);

      request.onsuccess = () => {
        this.addHistory('update_user', `Обновлен пользователь: ${user.username}`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(id, username) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['users', 'history'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.addHistory('delete_user', `Удален пользователь: ${username}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== РАБОТА С НАСТРОЙКАМИ ==========

  async getSetting(key, defaultValue = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings', 'history'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        this.addHistory('update_settings', `Обновлена настройка: ${key}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== РАБОТА С ИСТОРИЕЙ ==========

  async addHistory(action, description) {
    try {
      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      store.add({
        action,
        description,
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка записи в историю:', error);
    }
  }

  async getHistory(limit = 100) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const index = store.index('date');
      const request = index.openCursor(null, 'prev');

      const history = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          history.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(history);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ========== ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ ==========

  async initDemoData() {
    try {
      console.log('Проверка и создание демо-данных...');

      // Получаем список существующих хранилищ
      const storeNames = Array.from(this.db.objectStoreNames);

      // Создаем юридические лица
      if (storeNames.includes('legalEntities')) {
        const legalEntities = await this.getAllLegalEntities();
        if (legalEntities.length === 0) {
          console.log('Создание демо-юридических лиц...');
          const demoLegalEntities = [
            {
              name: "Администрация города",
              inn: "770000000001",
              ogrn: "1027700000001",
              address: "г. Москва, ул. Тверская, д. 13",
              phone: "+7 (495) 123-45-00"
            },
            {
              name: "МКУ \"Городское хозяйство\"",
              inn: "770000000002",
              ogrn: "1027700000002",
              address: "г. Москва, ул. Новый Арбат, д. 36",
              phone: "+7 (495) 123-45-01"
            },
            {
              name: "МБУ \"Центр обслуживания\"",
              inn: "770000000003",
              ogrn: "1027700000003",
              address: "г. Москва, ул. Покровка, д. 22",
              phone: "+7 (495) 123-45-02"
            }
          ];

          for (const entity of demoLegalEntities) {
            await this.addLegalEntity(entity);
          }
          console.log(`✓ Создано ${demoLegalEntities.length} юридических лиц`);
        }
      }

      // Создаем структурные подразделения
      if (storeNames.includes('structuralUnits')) {
        const units = await this.getAllStructuralUnits();
        if (units.length === 0) {
          console.log('Создание демо-структурных подразделений...');
          const demoUnits = [
            { name: "Департамент экономического развития", parentId: null, code: "DEP-01" },
            { name: "Департамент социальной политики", parentId: null, code: "DEP-02" },
            { name: "Управление образования", parentId: null, code: "DEP-03" },
            { name: "Управление здравоохранения", parentId: null, code: "DEP-04" },
            { name: "Отдел культуры и спорта", parentId: null, code: "DEP-05" },
            { name: "Управление транспорта и связи", parentId: null, code: "DEP-06" },
            { name: "Финансовое управление", parentId: null, code: "DEP-07" },
            { name: "Юридическое управление", parentId: null, code: "DEP-08" }
          ];

          for (const unit of demoUnits) {
            await this.addStructuralUnit(unit);
          }
          console.log(`✓ Создано ${demoUnits.length} структурных подразделений`);
        }
      }

      // Создаем сектора/отделы
      if (storeNames.includes('sectors')) {
        const sectors = await this.getAllSectors();
        if (sectors.length === 0) {
          console.log('Создание демо-секторов и отделов...');
          const demoSectors = [
            { name: "Отдел бюджетного планирования", structuralUnitId: 1 },
            { name: "Сектор муниципальных закупок", structuralUnitId: 1 },
            { name: "Отдел инвестиционной политики", structuralUnitId: 1 },
            { name: "Отдел социальных выплат", structuralUnitId: 2 },
            { name: "Сектор льготного обеспечения", structuralUnitId: 2 },
            { name: "Отдел демографической политики", structuralUnitId: 2 },
            { name: "Отдел дошкольного образования", structuralUnitId: 3 },
            { name: "Сектор общего образования", structuralUnitId: 3 },
            { name: "Отдел дополнительного образования", structuralUnitId: 3 },
            { name: "Отдел организации медицинской помощи", structuralUnitId: 4 },
            { name: "Сектор лекарственного обеспечения", structuralUnitId: 4 },
            { name: "Отдел спортивных мероприятий", structuralUnitId: 5 },
            { name: "Сектор культурного наследия", structuralUnitId: 5 },
            { name: "Отдел развития транспорта", structuralUnitId: 6 },
            { name: "Сектор связи и IT", structuralUnitId: 6 }
          ];

          for (const sector of demoSectors) {
            await this.addSector(sector);
          }
          console.log(`✓ Создано ${demoSectors.length} секторов/отделов`);
        }
      }

      // Создаем сотрудников
      if (storeNames.includes('employees')) {
        const employees = await this.getAllEmployees();
        if (employees.length === 0) {
          console.log('Создание демо-сотрудников...');
          const demoEmployees = [
            {
              name: "Иванов Сергей Михайлович",
              position: "Глава администрации",
              phone: "+7 (495) 123-45-67",
              internalPhone: "1001",
              email: "s.ivanov@cityadmin.ru",
              legalEntityId: 1,
              legalEntity: "Администрация города",
              structuralUnitId: 1,
              structuralUnit: "Департамент экономического развития",
              sectorId: 1,
              sector: "Отдел бюджетного планирования",
              office: "Кабинет 101",
              workHours: "Пн-Пт: 9:00-18:00",
              additional: "Прием по записи, предварительно согласовать по телефону"
            },
            {
              name: "Петрова Анна Владимировна",
              position: "Заместитель главы администрации",
              phone: "+7 (495) 123-45-68",
              internalPhone: "1002",
              email: "a.petrova@cityadmin.ru",
              legalEntityId: 1,
              legalEntity: "Администрация города",
              structuralUnitId: 2,
              structuralUnit: "Департамент социальной политики",
              sectorId: 4,
              sector: "Отдел социальных выплат",
              office: "Кабинет 102",
              workHours: "Пн-Пт: 9:00-18:00",
              additional: "Прием граждан: вторник, четверг с 14:00 до 17:00"
            },
            {
              name: "Сидоров Алексей Николаевич",
              position: "Начальник управления",
              phone: "+7 (495) 123-45-69",
              internalPhone: "1003",
              email: "a.sidorov@cityadmin.ru",
              legalEntityId: 2,
              legalEntity: "МКУ \"Городское хозяйство\"",
              structuralUnitId: 3,
              structuralUnit: "Управление образования",
              sectorId: 7,
              sector: "Отдел дошкольного образования",
              office: "Кабинет 201",
              workHours: "Пн-Пт: 9:00-17:00",
              additional: "Ответственный за дошкольные учреждения"
            },
            {
              name: "Козлова Елена Петровна",
              position: "Главный специалист",
              phone: "+7 (495) 123-45-70",
              internalPhone: "1004",
              email: "e.kozlova@cityadmin.ru",
              legalEntityId: 1,
              legalEntity: "Администрация города",
              structuralUnitId: 4,
              structuralUnit: "Управление здравоохранения",
              sectorId: 10,
              sector: "Отдел организации медицинской помощи",
              office: "Кабинет 305",
              workHours: "Пн-Пт: 9:00-18:00",
              additional: "Куратор поликлиник города"
            },
            {
              name: "Михайлов Дмитрий Игоревич",
              position: "Начальник отдела",
              phone: "+7 (495) 123-45-71",
              internalPhone: "1005",
              email: "d.mikhailov@cityadmin.ru",
              legalEntityId: 2,
              legalEntity: "МКУ \"Городское хозяйство\"",
              structuralUnitId: 5,
              structuralUnit: "Отдел культуры и спорта",
              sectorId: 12,
              sector: "Отдел спортивных мероприятий",
              office: "Кабинет 150",
              workHours: "Пн-Пт: 8:30-17:30",
              additional: "Куратор спортивных мероприятий"
            },
            {
              name: "Новикова Ирина Сергеевна",
              position: "Ведущий специалист",
              phone: "+7 (495) 123-45-72",
              internalPhone: "1006",
              email: "i.novikova@cityadmin.ru",
              legalEntityId: 1,
              legalEntity: "Администрация города",
              structuralUnitId: 2,
              structuralUnit: "Департамент социальной политики",
              sectorId: 5,
              sector: "Сектор льготного обеспечения",
              office: "Кабинет 208",
              workHours: "Пн-Пт: 9:00-18:00",
              additional: "Прием по вопросам льгот: среда 10:00-12:00"
            },
            {
              name: "Волков Константин Андреевич",
              position: "Начальник отдела",
              phone: "+7 (495) 123-45-73",
              internalPhone: "1007",
              email: "k.volkov@cityadmin.ru",
              legalEntityId: 1,
              legalEntity: "Администрация города",
              structuralUnitId: 6,
              structuralUnit: "Управление транспорта и связи",
              sectorId: 14,
              sector: "Отдел развития транспорта",
              office: "Кабинет 310",
              workHours: "Пн-Пт: 9:00-18:00",
              additional: "Ответственный за транспортную инфраструктуру"
            }
          ];

          for (const emp of demoEmployees) {
            await this.addEmployee(emp);
          }
          console.log(`✓ Создано ${demoEmployees.length} сотрудников`);
        }
      }

      console.log('✅ Инициализация демо-данных завершена успешно');
    } catch (error) {
      console.error('❌ Ошибка при инициализации демо-данных:', error);
      // Не выбрасываем ошибку, чтобы приложение продолжило работу
    }
  }

  // ========== ЭКСПОРТ/ИМПОРТ ДАННЫХ ==========

  async exportData() {
    const employees = await this.getAllEmployees();
    const departments = await this.getAllDepartments();
    const users = await this.getAllUsers();
    const structuralUnits = await this.getAllStructuralUnits();
    const legalEntities = await this.getAllLegalEntities();
    const sectors = await this.getAllSectors();

    const settings = {};
    const settingsKeys = ['orgName', 'requireAuth'];
    for (const key of settingsKeys) {
      settings[key] = await this.getSetting(key, null);
    }

    const exportData = {
      version: '3.0',
      exportDate: new Date().toISOString(),
      employees,
      departments,
      users,
      structuralUnits,
      legalEntities,
      sectors,
      settings
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (!data.employees) {
        throw new Error('Неверный формат данных');
      }

      // Очищаем существующие данные
      await this.clearAllData();

      // Импортируем юридические лица
      if (data.legalEntities && data.legalEntities.length > 0) {
        for (const entity of data.legalEntities) {
          const { id, ...entityData } = entity;
          await this.addLegalEntity(entityData);
        }
      }

      // Импортируем структурные подразделения
      if (data.structuralUnits && data.structuralUnits.length > 0) {
        for (const unit of data.structuralUnits) {
          const { id, ...unitData } = unit;
          await this.addStructuralUnit(unitData);
        }
      }

      // Импортируем сектора
      if (data.sectors && data.sectors.length > 0) {
        for (const sector of data.sectors) {
          const { id, ...sectorData } = sector;
          await this.addSector(sectorData);
        }
      }

      // Импортируем отделы (старые)
      if (data.departments && data.departments.length > 0) {
        for (const dept of data.departments) {
          const deptName = typeof dept === 'string' ? dept : dept.name;
          if (deptName) {
            await this.addDepartment(deptName);
          }
        }
      }

      // Импортируем сотрудников
      for (const emp of data.employees) {
        const { id, ...empData } = emp;
        await this.addEmployee(empData);
      }

      // Импортируем пользователей
      if (data.users && data.users.length > 0) {
        for (const user of data.users) {
          const { id, ...userData } = user;
          const existing = await this.getUserByUsername(userData.username);
          if (!existing) {
            await this.addUser(userData);
          }
        }
      }

      // Импортируем настройки
      if (data.settings) {
        for (const [key, value] of Object.entries(data.settings)) {
          if (value !== null) {
            await this.setSetting(key, value);
          }
        }
      }

      await this.addHistory('import', 'Импорт данных');
      console.log('Данные успешно импортированы');
      return true;
    } catch (error) {
      console.error('Ошибка импорта:', error);
      throw error;
    }
  }

  async clearAllData() {
    const stores = ['employees', 'departments', 'history', 'users', 'structuralUnits', 'legalEntities', 'sectors'];

    for (const storeName of stores) {
      if (this.db.objectStoreNames.contains(storeName)) {
        await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => {
            console.log(`Хранилище ${storeName} очищено`);
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    await this.addHistory('clear_all', 'Очистка всех данных');
  }

  async searchEmployees(searchTerm) {
    const employees = await this.getAllEmployees();
    const term = searchTerm.toLowerCase().trim();

    if (!term) return employees;

    return employees.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term) ||
      (emp.department && emp.department.toLowerCase().includes(term)) ||
      (emp.structuralUnit && emp.structuralUnit.toLowerCase().includes(term)) ||
      (emp.sector && emp.sector.toLowerCase().includes(term)) ||
      (emp.legalEntity && emp.legalEntity.toLowerCase().includes(term)) ||
      emp.phone.includes(term) ||
      (emp.internalPhone && emp.internalPhone.includes(term)) ||
      (emp.email && emp.email.toLowerCase().includes(term))
    );
  }
}

// Создаем глобальный экземпляр базы данных
const db = new EmployeeDatabase();