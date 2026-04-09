import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SEATABLE_BASE_URL = os.getenv('SEATABLE_URL', 'https://ditable.yanao.ru')
    SEATABLE_API_TOKEN = os.getenv('SEATABLE_TOKEN', '0d587e5bfac8f558d0a908d871c50db1fee0d047')
    SEATABLE_BASE_UUID = os.getenv('SEATABLE_BASE_UUID', '572d2646-73b9-4a2f-bd19-03ca42b4ceef')
    SEATABLE_TABLE_NAME = os.getenv('SEATABLE_TABLE_NAME', 'Справочник телефонов')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')