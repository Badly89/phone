import httpx
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class SeaTableClient:
    def __init__(self, base_url: str, api_token: str, base_uuid: str, table_name: str):
        self.base_url = base_url
        self.api_token = api_token
        self.base_uuid = base_uuid
        self.table_name = table_name
        self.base_token = None
        self.options_map = {}
        
    async def get_base_token(self) -> bool:
        url = f"{self.base_url}/api/v2.1/dtable/app-access-token/"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers={
                        'accept': 'application/json',
                        'authorization': f'Bearer {self.api_token}'
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.base_token = data.get('access_token')
                    logger.info("✅ Base-Token obtained")
                    return True
                else:
                    logger.error(f"Failed to get Base-Token: {response.status_code}")
                    return False
                    
            except Exception as e:
                logger.error(f"Exception: {e}")
                return False
    
    async def load_column_mapping(self) -> Dict[str, Dict[str, str]]:
        if not self.base_token:
            await self.get_base_token()
        
        url = f"{self.base_url}/api-gateway/api/v2/dtables/${self.base_uuid}/metadata/"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers={
                        'accept': 'application/json',
                        'authorization': f'Bearer {self.base_token}'
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    tables = data.get('tables', [])
                    current_table = next((t for t in tables if t.get('name') == self.table_name), None)
                    
                    if current_table:
                        columns = current_table.get('columns', [])
                        for col in columns:
                            if col.get('type') == 'single-select' and col.get('data', {}).get('options'):
                                self.options_map[col['key']] = {}
                                for opt in col['data']['options']:
                                    self.options_map[col['key']][str(opt['id'])] = opt['name']
                                logger.info(f"Loaded {len(self.options_map[col['key']])} options for {col['key']}")
                    
                    return self.options_map
                else:
                    logger.warning(f"Failed to load metadata: {response.status_code}")
                    return {}
                    
            except Exception as e:
                logger.error(f"Exception: {e}")
                return {}
    
    def get_select_value(self, value, column_key: str) -> str:
        if not value:
            return ''
        value_str = str(value)
        if column_key in self.options_map and value_str in self.options_map[column_key]:
            return self.options_map[column_key][value_str]
        return value_str
    
    async def get_all_employees(self) -> List[Dict[str, Any]]:
        if not self.base_token:
            await self.get_base_token()
        
        await self.load_column_mapping()
        
        url = f"{self.base_url}/api-gateway/api/v2/dtables/{self.base_uuid}/rows/"
        params = {
            'table_name': self.table_name,
            'limit': 1000
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers={
                        'accept': 'application/json',
                        'authorization': f'Bearer {self.base_token}'
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    rows = data.get('rows', [])
                    logger.info(f"Fetched {len(rows)} rows")
                    return self._map_employees(rows)
                else:
                    logger.error(f"Failed: {response.status_code}")
                    return []
                    
            except Exception as e:
                logger.error(f"Exception: {e}")
                return []
    
    def _map_employees(self, rows: List[Dict]) -> List[Dict]:
        employees = []
        
        for row in rows:
            employee = {
                'id': row.get('_id'),
                'name': row.get('NWII'),
                'position': row.get('AWFM'),
                'office': row.get('7ZMT'),
                'phone': row.get('YYiN'),
                'internalPhone': row.get('01m7'),
                'management': self.get_select_value(row.get('MBPb'), 'MBPb'),
                'structuralUnit': self.get_select_value(row.get('c7bW'), 'c7bW'),
                'legalEntity': self.get_select_value(row.get('mTfn'), 'mTfn'),
                'code': row.get('0000')
            }
            employees.append(employee)
        
        if employees:
            logger.info(f"Sample employee: {employees[0]}")
        
        return employees