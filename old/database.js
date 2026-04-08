// database.js - исправленная версия

class EmployeeDatabase {
    constructor() {
        this.dbName = 'PhoneDirectoryDB';
        this.dbVersion = 3; // Увеличиваем версию
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для сотрудников
                if (!db.objectStoreNames.contains('employees')) {
                    const store = db.createObjectStore('employees', { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('department', 'department', { unique: false });
                    store.createIndex('position', 'position', { unique: false });
                }
                
                // Создаем хранилище для пользователей
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('username', 'username', { unique: true });
                    userStore.createIndex('role', 'role', { unique: false });
                }
                
                // Создаем хранилище для отделов
                if (!db.objectStoreNames.contains('departments')) {
                    db.createObjectStore('departments', { keyPath: 'id', autoIncrement: true });
                }
                
                // Создаем хранилище для истории
                if (!db.objectStoreNames.contains('history')) {
                    db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                }
                
                // Создаем хранилище для настроек
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // ========== РАБОТА С СОТРУДНИКАМИ ==========
    
    async getAllEmployees() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async addEmployee(employee) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            
            // Генерируем уникальный ID если его нет
            if (!employee.id) {
                employee.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            const request = store.add(employee);
            
            request.onsuccess = () => resolve(employee);
            request.onerror = (event) => {
                // Если ключ уже существует, пробуем обновить
                if (event.target.error.name === 'ConstraintError') {
                    const updateRequest = store.put(employee);
                    updateRequest.onsuccess = () => resolve(employee);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(event.target.error);
                }
            };
        });
    }

    async updateEmployee(id, employee) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            
            const updatedEmployee = {
                ...employee,
                id: id,
                _updated: new Date().toISOString()
            };
            
            const request = store.put(updatedEmployee);
            
            request.onsuccess = () => resolve(updatedEmployee);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteEmployee(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllEmployees() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getEmployeesByDepartment(department) {
        const employees = await this.getAllEmployees();
        return employees.filter(emp => emp.department === department);
    }

    async searchEmployees(query) {
        const employees = await this.getAllEmployees();
        const lowerQuery = query.toLowerCase();
        return employees.filter(emp => 
            (emp.name || '').toLowerCase().includes(lowerQuery) ||
            (emp.position || '').toLowerCase().includes(lowerQuery) ||
            (emp.department || '').toLowerCase().includes(lowerQuery) ||
            (emp.phone || '').includes(query)
        );
    }

    // ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
    
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserByUsername(username) {
        const users = await this.getAllUsers();
        return users.find(user => user.username === username);
    }

    async addUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const newUser = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...user,
                _created: new Date().toISOString()
            };
            
            const request = store.add(newUser);
            
            request.onsuccess = () => resolve(newUser);
            request.onerror = () => reject(request.error);
        });
    }

    async updateUser(id, user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const updatedUser = {
                ...user,
                id: id,
                _updated: new Date().toISOString()
            };
            
            const request = store.put(updatedUser);
            
            request.onsuccess = () => resolve(updatedUser);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteUser(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ========== ЗАГРУЗКА ИЗ SEATABLE ==========
    
    async loadFromSeaTable() {
        if (!window.seatableLoader) {
            console.warn('SeaTableLoader не инициализирован');
            return false;
        }
        
        try {
            const employees = await window.seatableLoader.loadEmployees();
            if (employees && employees.length > 0) {
                // Очищаем существующих сотрудников
                await this.clearAllEmployees();
                
                // Добавляем новых
                for (const emp of employees) {
                    await this.addEmployee(emp);
                }
                console.log(`Загружено ${employees.length} сотрудников из SeaTable`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка загрузки из SeaTable:', error);
            return false;
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    async clearAllData() {
        await this.clearAllEmployees();
    }
}

// Делаем класс доступным глобально
window.EmployeeDatabase = EmployeeDatabase;