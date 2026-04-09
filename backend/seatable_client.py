import httpx
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class SeaTableClient:
    def __init__(self, base_url: str, api_token: str, base_uuid: str, table_name: str):
        self.base_url = base_url
        self.api_token = api_token
        self.base_uuid = base_uuid
        self.table_name = table_name
        self.base_token = None
        
        self.keys = {
            'name': 'NWII',
            'position': 'AWFM',
            'office': '7ZMT',
            'phone': 'YYiN',
            'internalPhone': '01m7',
            'structuralUnit': 'c7bW',
            'management': 'MBPb',
            'legalEntity': 'mTfn'
        }
        
        logger.info(f"SeaTableClient initialized with URL: {self.base_url}")

    async def get_base_token(self) -> bool:
        try:
            url = f"{self.base_url}/api/v2.1/dtable/app-access-token/"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        'accept': 'application/json',
                        'authorization': f"Bearer {self.api_token}"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.base_token = data['access_token']
                    logger.info("✅ Base token obtained successfully")
                    return True
                else:
                    logger.error(f"❌ Failed to get token: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
            return False

    async def get_all_employees(self) -> List[Dict[str, Any]]:
        if not self.base_token:
            logger.info("No base token, getting new one...")
            if not await self.get_base_token():
                return []

        try:
            url = f"{self.base_url}/api-gateway/api/v2/dtables/{self.base_uuid}/rows/"
            params = {
                'table_name': self.table_name,
                'limit': 1000
            }
            headers = {
                'accept': 'application/json',
                'authorization': f"Bearer {self.base_token}"
            }
            
            logger.info(f"Fetching employees from: {url}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    rows = data.get('rows', [])
                    logger.info(f"✅ Fetched {len(rows)} rows from SeaTable")
                    return self._map_employees(rows)
                else:
                    logger.error(f"❌ Failed to fetch employees: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Load error: {e}")
            return []

    def _map_employees(self, rows: List[Dict]) -> List[Dict[str, Any]]:
        employees = []
        for row in rows:
            employee = {
                'id': row.get('_id', ''),
                'name': row.get(self.keys['name'], ''),
                'position': row.get(self.keys['position'], ''),
                'legalEntity': row.get(self.keys['legalEntity'], ''),
                'structuralUnit': row.get(self.keys['structuralUnit'], ''),
                'management': row.get(self.keys['management'], ''),
                'phone': row.get(self.keys['phone'], ''),
                'internalPhone': row.get(self.keys['internalPhone'], ''),
                'office': row.get(self.keys['office'], ''),
                'code': row.get('0000', '')
            }
            employees.append(employee)
        
        return employees