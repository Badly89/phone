class SeaTableLoader {
    constructor() {
        this.config = {
            baseUrl: 'https://ditable.yanao.ru',
            apiToken: '0d587e5bfac8f558d0a908d871c50db1fee0d047',
            baseUuid: '572d2646-73b9-4a2f-bd19-03ca42b4ceef',
            tableName: 'ТЕСТ'
        };
        this.baseToken = null;
        
        this.keys = {
            name: 'NWII',
            position: 'AWFM',
            office: '7ZMT',
            phone: 'YYiN',
            internalPhone: '01m7',
            structuralUnit: 'MBPb',
            management: 'c7bW',
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
            legalEntity: row[this.keys.legalEntity] || '',
            structuralUnit: row[this.keys.structuralUnit] || '',
            management: row[this.keys.management] || '',
            phone: row[this.keys.phone] || '',
            internalPhone: row[this.keys.internalPhone] || '',
            office: row[this.keys.office] || '',
            
        }));
    }
}

window.seatableLoader = new SeaTableLoader();