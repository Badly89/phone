class SeaTableLoader {
    constructor() {
        this.config = {
            baseUrl: 'https://ditable.yanao.ru',
            apiToken: '0d587e5bfac8f558d0a908d871c50db1fee0d047',
            baseUuid: '572d2646-73b9-4a2f-bd19-03ca42b4ceef',
            tableName: 'Справочник телефонов'
        };
        this.baseToken = null;
        
        // МАППИНГ КЛЮЧЕЙ
       this.keys = {
    name: 'NWII',           // ФИО
    position: 'AWFM',       // Должность
    office: '7ZMT',         // Кабинет
    phone: 'YYiN',          // Телефон
    internalPhone: '01m7',  // Внутренний номер
    structuralUnit: 'c7bW', // Структурное подразделение
    management: 'MBPb',     // Управление
    legalEntity: 'mTfn'     // Юридическое лицо
};
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

    async loadEmployees() {
        if (!this.baseToken) await this.getBaseToken();
        
        try {
            const url = `${this.config.baseUrl}/api-gateway/api/v2/dtables/${this.config.baseUuid}/rows/`;
            const response = await fetch(`${url}?table_name=${encodeURIComponent(this.config.tableName)}&limit=500`, {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Получено строк:', data.rows?.length);
                
                // Диагностика: выводим структуру single select полей
                if (data.rows && data.rows.length > 0) {
                    const firstRow = data.rows[0];
                    console.log('=== ДИАГНОСТИКА SINGLE SELECT ===');
                    console.log('Поле MBPb (структурное подразделение):', firstRow['MBPb']);
                    console.log('Поле c7bW (управление):', firstRow['c7bW']);
                    console.log('Поле mTfn (юрлицо):', firstRow['mTfn']);
                    console.log('Тип MBPb:', typeof firstRow['MBPb']);
                    console.log('Тип c7bW:', typeof firstRow['c7bW']);
                    console.log('Тип mTfn:', typeof firstRow['mTfn']);
                    
                    // Если это объект, выводим его структуру
                    if (typeof firstRow['MBPb'] === 'object') {
                        console.log('Структура MBPb:', JSON.stringify(firstRow['MBPb'], null, 2));
                    }
                    if (typeof firstRow['c7bW'] === 'object') {
                        console.log('Структура c7bW:', JSON.stringify(firstRow['c7bW'], null, 2));
                    }
                    if (typeof firstRow['mTfn'] === 'object') {
                        console.log('Структура mTfn:', JSON.stringify(firstRow['mTfn'], null, 2));
                    }
                }
                
                return this.mapEmployees(data.rows || []);
            }
            return [];
        } catch (error) {
            console.error('Load error:', error);
            return [];
        }
    }

   // Расширенная функция для извлечения значения
// Расширенная функция для извлечения значения
extractSelectName(field) {
    if (!field) return '';
    
    // null или undefined
    if (field === null || field === undefined) return '';
    
    // Если это строка
    if (typeof field === 'string') return field;
    
    // Если это число
    if (typeof field === 'number') return String(field);
    
    // Если это объект
    if (typeof field === 'object') {
        // Пробуем получить name (основной формат single select)
        if (field.name) return field.name;
        // Пробуем получить value
        if (field.value) return field.value;
        // Пробуем получить title
        if (field.title) return field.title;
        // Пробуем получить label
        if (field.label) return field.label;
        
        // Если это массив (multiple select)
        if (Array.isArray(field)) {
            const values = field.map(item => {
                if (typeof item === 'string') return item;
                if (item && item.name) return item.name;
                if (item && item.value) return item.value;
                return '';
            }).filter(Boolean);
            return values.join(', ');
        }
        
        // Если ничего не нашли, выводим в консоль для отладки
        console.log('Неизвестный формат single select:', field);
        return '';
    }
    
    return '';
}

    mapEmployees(rows) {
        return rows.map(row => {
            // Извлекаем значения из single select полей (получаем name)
            const management = this.extractSelectName(row[this.keys.management]);
            const structuralUnit = this.extractSelectName(row[this.keys.structuralUnit]);
            const legalEntity = this.extractSelectName(row[this.keys.legalEntity]);
            
            // Логируем первый элемент для проверки
            if (rows.indexOf(row) === 0) {
                console.log('=== РЕЗУЛЬТАТ ПАРСИНГА ===');
                console.log('Управление (c7bW):', row[this.keys.management]);
                console.log('-> Извлечено name:', management);
                console.log('Структурное подразделение (MBPb):', row[this.keys.structuralUnit]);
                console.log('-> Извлечено name:', structuralUnit);
                console.log('Юридическое лицо (mTfn):', row[this.keys.legalEntity]);
                console.log('-> Извлечено name:', legalEntity);
            }
            
            return {
                id: row._id,
                name: row[this.keys.name] || '',
                position: row[this.keys.position] || '',
                legalEntity: legalEntity,
                structuralUnit: structuralUnit,
                management: management,
                phone: row[this.keys.phone] || '',
                internalPhone: row[this.keys.internalPhone] || '',
                office: row[this.keys.office] || '',
                code: row[this.keys.code] || ''
            };
        });
    }
}

window.seatableLoader = new SeaTableLoader();
console.log('SeaTableLoader initialized with single select name extraction');