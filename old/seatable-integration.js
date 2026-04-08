// seatable-integration.js
// Модуль для работы с SeaTable API

class SeaTableIntegration {
    constructor() {
        this.baseUrl = 'https://cloud.seatable.io';
        this.apiToken = null;
        this.baseToken = null;
        this.baseUuid = null;
        this.tableName = 'Сотрудники';
        this.workspaceId = null;
        this.isConnected = false;
        
        // Загружаем настройки из localStorage
        this.loadSettings();
    }
    
    loadSettings() {
        const settings = localStorage.getItem('seatable_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.baseUrl = parsed.baseUrl || 'https://cloud.seatable.io';
            this.apiToken = parsed.apiToken;
            this.baseUuid = parsed.baseUuid;
            this.tableName = parsed.tableName || 'Сотрудники';
            this.isConnected = parsed.isConnected || false;
            
            if (this.apiToken && this.baseUuid) {
                this.refreshBaseToken();
            }
        }
    }
    
    saveSettings() {
        const settings = {
            baseUrl: this.baseUrl,
            apiToken: this.apiToken,
            baseUuid: this.baseUuid,
            tableName: this.tableName,
            isConnected: this.isConnected
        };
        localStorage.setItem('seatable_settings', JSON.stringify(settings));
    }
    
    async refreshBaseToken() {
        if (!this.apiToken) return false;
        
        try {
            const response = await fetch(`${this.baseUrl}/api/v2.1/dtable/app-access-token/`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.apiToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.baseToken = data.access_token;
                this.workspaceId = data.workspace_id;
                if (!this.baseUuid) {
                    this.baseUuid = data.dtable_uuid;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка получения Base-Token:', error);
            return false;
        }
    }
    
    async connect(apiToken, baseUuid, tableName = 'Сотрудники') {
        this.apiToken = apiToken;
        this.baseUuid = baseUuid;
        this.tableName = tableName;
        
        const success = await this.refreshBaseToken();
        if (success) {
            this.isConnected = true;
            this.saveSettings();
        }
        return success;
    }
    
    disconnect() {
        this.apiToken = null;
        this.baseToken = null;
        this.baseUuid = null;
        this.isConnected = false;
        this.saveSettings();
    }
    
    async getAllEmployees() {
        if (!this.isConnected || !this.baseToken) {
            console.error('Не подключено к SeaTable');
            return null;
        }
        
        try {
            const url = `${this.baseUrl}/api-gateway/api/v2/dtables/${this.baseUuid}/rows/`;
            const response = await fetch(`${url}?table_name=${encodeURIComponent(this.tableName)}&limit=1000`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return this.mapRowsToEmployees(data.rows || []);
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения сотрудников:', error);
            return null;
        }
    }
    
    mapRowsToEmployees(rows) {
        // Маппинг колонок SeaTable в формат EmployeeDatabase
        return rows.map(row => ({
            id: row._id,
            name: row['ФИО'] || row['Name'] || row['name'] || '',
            position: row['Должность'] || row['Position'] || '',
            department: row['Отдел'] || row['Department'] || '',
            phone: row['Телефон'] || row['Phone'] || '',
            internalPhone: row['Внутренний номер'] || row['InternalPhone'] || '',
            email: row['Email'] || '',
            office: row['Кабинет'] || row['Office'] || '',
            workHours: row['Часы работы'] || row['WorkHours'] || '',
            additional: row['Дополнительная информация'] || '',
            legalEntity: row['Юридическое лицо'] || '',
            structuralUnit: row['Структурное подразделение'] || '',
            sector: row['Отдел/Сектор'] || '',
            _ctime: row._ctime,
            _mtime: row._mtime
        }));
    }
    
    mapEmployeeToRow(employee) {
        // Маппинг формата EmployeeDatabase в колонки SeaTable
        return {
            'ФИО': employee.name,
            'Должность': employee.position,
            'Отдел': employee.department,
            'Телефон': employee.phone,
            'Внутренний номер': employee.internalPhone || '',
            'Email': employee.email || '',
            'Кабинет': employee.office || '',
            'Часы работы': employee.workHours || '',
            'Дополнительная информация': employee.additional || '',
            'Юридическое лицо': employee.legalEntity || '',
            'Структурное подразделение': employee.structuralUnit || '',
            'Отдел/Сектор': employee.sector || ''
        };
    }
    
    async addEmployee(employee) {
        if (!this.isConnected || !this.baseToken) return null;
        
        try {
            const url = `${this.baseUrl}/api-gateway/api/v2/dtables/${this.baseUuid}/rows/`;
            const row = this.mapEmployeeToRow(employee);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    table_name: this.tableName,
                    rows: [row],
                    use_column_default: false
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                return result;
            }
            return null;
        } catch (error) {
            console.error('Ошибка добавления сотрудника:', error);
            return null;
        }
    }
    
    async updateEmployee(employeeId, employee) {
        if (!this.isConnected || !this.baseToken) return null;
        
        try {
            const url = `${this.baseUrl}/api-gateway/api/v2/dtables/${this.baseUuid}/rows/${employeeId}/`;
            const row = this.mapEmployeeToRow(employee);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    table_name: this.tableName,
                    row: row
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Ошибка обновления сотрудника:', error);
            return false;
        }
    }
    
    async deleteEmployee(employeeId) {
        if (!this.isConnected || !this.baseToken) return false;
        
        try {
            const url = `${this.baseUrl}/api-gateway/api/v2/dtables/${this.baseUuid}/rows/${employeeId}/`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('Ошибка удаления сотрудника:', error);
            return false;
        }
    }
    
    async syncEmployees(employees) {
        if (!this.isConnected || !this.baseToken) return false;
        
        try {
            // Получаем существующих сотрудников
            const existing = await this.getAllEmployees();
            const existingIds = new Set(existing.map(e => e.id));
            
            // Добавляем новых
            const toAdd = employees.filter(e => !existingIds.has(e.id));
            for (const emp of toAdd) {
                await this.addEmployee(emp);
            }
            
            // Обновляем существующих (по желанию можно добавить логику)
            
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр
window.seatableIntegration = new SeaTableIntegration();