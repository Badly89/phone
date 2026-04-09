// services/seatableService.js
class SeaTableService {
    constructor() {
        this.config = {
            baseUrl: import.meta.env.VITE_SEATABLE_URL || 'https://ditable.yanao.ru',
            apiToken: import.meta.env.VITE_SEATABLE_TOKEN || '0d587e5bfac8f558d0a908d871c50db1fee0d047',
            baseUuid: import.meta.env.VITE_SEATABLE_BASE_UUID || '572d2646-73b9-4a2f-bd19-03ca42b4ceef',
            tableName: import.meta.env.VITE_SEATABLE_TABLE_NAME || 'Справочник телефонов'
        };
        this.baseToken = null;
        this.optionsMap = {}; // Маппинг ID → название для single-select
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

    async getColumnOptions() {
        if (!this.baseToken) {
            await this.getBaseToken();
        }
        
        try {
            const url = `${this.config.baseUrl}/api-gateway/api/v2/dtables/${this.config.baseUuid}/metadata/`;
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
                    currentTable.columns.forEach(col => {
                        if (col.type === 'single-select' && col.data && col.data.options) {
                            this.optionsMap[col.key] = {};
                            col.data.options.forEach(opt => {
                                this.optionsMap[col.key][opt.id] = opt.name;
                            });
                        }
                    });
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error getting column options:', error);
            return false;
        }
    }

    getSelectValue(value, columnKey) {
        if (!value) return '';
        const valueStr = String(value);
        const map = this.optionsMap[columnKey];
        return map?.[valueStr] || valueStr;
    }

    async fetchEmployees() {
        if (!this.baseToken) {
            await this.getBaseToken();
        }
        
        await this.getColumnOptions();
        
        try {
            const url = `${this.config.baseUrl}/api-gateway/api/v2/dtables/${this.config.baseUuid}/rows/`;
            const fullUrl = `${url}?table_name=${encodeURIComponent(this.config.tableName)}&limit=1000`;
            
            const response = await fetch(fullUrl, {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.baseToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return this.mapEmployees(data.rows || []);
            }
            return [];
        } catch (error) {
            console.error('Load error:', error);
            return [];
        }
    }

    mapEmployees(rows) {
        return rows.map(row => ({
            id: row._id,
            name: row[this.keys.name] || '',
            position: row[this.keys.position] || '',
            legalEntity: this.getSelectValue(row[this.keys.legalEntity], this.keys.legalEntity),
            structuralUnit: this.getSelectValue(row[this.keys.structuralUnit], this.keys.structuralUnit),
            management: this.getSelectValue(row[this.keys.management], this.keys.management),
            phone: row[this.keys.phone] || '',
            internalPhone: row[this.keys.internalPhone] || '',
            office: row[this.keys.office] || ''
        }));
    }

    async getFilters() {
        const employees = await this.fetchEmployees();
        
        const managements = [...new Set(employees.map(e => e.management).filter(Boolean))].sort();
        const structuralUnits = [...new Set(employees.map(e => e.structuralUnit).filter(Boolean))].sort();
        const legalEntities = [...new Set(employees.map(e => e.legalEntity).filter(Boolean))].sort();
        
        return { managements, structuralUnits, legalEntities };
    }
}

export default new SeaTableService();