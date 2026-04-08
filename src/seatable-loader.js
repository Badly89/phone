class SeaTableLoader {
    constructor() {
        this.config = {
            baseUrl: 'https://ditable.yanao.ru',
            apiToken: '0d587e5bfac8f558d0a908d871c50db1fee0d047',
            baseUuid: '572d2646-73b9-4a2f-bd19-03ca42b4ceef',
            tableName: 'Справочник телефонов'
        };
        this.baseToken = null;
        this.optionsMap = {}; // Хранилище маппинга ID → название для single-select колонок
        
        // Ключи колонок (из ваших данных)
        this.keys = {
            name: 'NWII',
            position: 'AWFM',
            office: '7ZMT',
            phone: 'YYiN',
            internalPhone: '01m7',
            structuralUnit: 'c7bW',
            management: 'MBPb',
            legalEntity: 'mTfn'
        };
        
        console.log('SeaTableLoader создан');
    }

    async getBaseToken() {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/v2.1/dtable/app-access-token/`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.config.apiToken}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                this.baseToken = data.access_token;
                console.log('Connected to SeaTable');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connection error:', error);
            return false;
        }
    }

    // Получаем метаданные таблицы и создаём маппинг ID → название для single-select колонок
    async getColumnOptions() {
        if (!this.baseToken) {
            await this.getBaseToken();
        }
        
        try {
            const url = `${this.config.baseUrl}/api-gateway/api/v2/dtables/${this.config.baseUuid}/metadata/`;
            console.log('Запрос метаданных:', url);
            
            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const tables = data.tables || [];
                const currentTable = tables.find(t => t.name === this.config.tableName);
                
                if (currentTable && currentTable.columns) {
                    // Создаём маппинг для каждой single-select колонки
                    currentTable.columns.forEach(col => {
                        if (col.type === 'single-select' && col.data && col.data.options) {
                            this.optionsMap[col.key] = {};
                            col.data.options.forEach(opt => {
                                this.optionsMap[col.key][opt.id] = opt.name;
                            });
                            console.log(`Загружено опций для ${col.key} (${col.name}):`, Object.keys(this.optionsMap[col.key]).length);
                        }
                    });
                }
                
                console.log('Маппинг ID → название готов');
                return true;
            }
            
            console.warn('Не удалось получить метаданные, будет использован fallback');
            return false;
        } catch (error) {
            console.error('Error getting column metadata:', error);
            return false;
        }
    }

    // Преобразует ID в название для single-select полей
    getSelectValue(value, columnKey) {
        if (!value) return '';
        
        const valueStr = String(value);
        const map = this.optionsMap[columnKey];
        
        if (map && map[valueStr]) {
            return map[valueStr];
        }
        
        // Fallback: возвращаем ID как строку, если маппинг не найден
        return valueStr;
    }

    async loadEmployees() {
        console.log('loadEmployees вызван');
        
        if (!this.baseToken) {
            const success = await this.getBaseToken();
            if (!success) return [];
        }
        
        // Получаем маппинг для single-select колонок
        await this.getColumnOptions();
        
        try {
            const url = `${this.config.baseUrl}/api-gateway/api/v2/dtables/${this.config.baseUuid}/rows/`;
            const fullUrl = `${url}?table_name=${encodeURIComponent(this.config.tableName)}&limit=500`;
            console.log('Запрос строк:', fullUrl);
            
            const response = await fetch(fullUrl, {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Получено строк:', data.rows?.length);
                
                // Диагностика
                if (data.rows && data.rows.length > 0) {
                    const firstRow = data.rows[0];
                    console.log('=== ДИАГНОСТИКА ===');
                    console.log('Управление (MBPb) ID:', firstRow['MBPb'], '→ Название:', this.getSelectValue(firstRow['MBPb'], 'MBPb'));
                    console.log('Отдел (c7bW) ID:', firstRow['c7bW'], '→ Название:', this.getSelectValue(firstRow['c7bW'], 'c7bW'));
                    console.log('Юрлицо (mTfn) ID:', firstRow['mTfn'], '→ Название:', this.getSelectValue(firstRow['mTfn'], 'mTfn'));
                }
                
                return this.mapEmployees(data.rows || []);
            }
            return [];
        } catch (error) {
            console.error('Load error:', error);
            return [];
        }
    }

    mapEmployees(rows) {
        return rows.map(row => {
            // Преобразуем ID в названия для single-select полей
            const management = this.getSelectValue(row[this.keys.management], this.keys.management);
            const structuralUnit = this.getSelectValue(row[this.keys.structuralUnit], this.keys.structuralUnit);
            const legalEntity = this.getSelectValue(row[this.keys.legalEntity], this.keys.legalEntity);
            
            return {
                id: row._id,
                name: row[this.keys.name] || '',
                position: row[this.keys.position] || '',
                legalEntity: legalEntity,
                structuralUnit: structuralUnit,
                management: management,
                phone: row[this.keys.phone] || '',
                internalPhone: row[this.keys.internalPhone] || '',
                office: row[this.keys.office] || ''
            };
        });
    }
}

const seatableLoader = new SeaTableLoader();
export default seatableLoader;