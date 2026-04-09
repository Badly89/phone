import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
import traceback
from config import Config
from seatable_client import SeaTableClient


app = FastAPI(title="Phonebook API", lifespan=lifespan)

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

seatable_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global seatable_client
    logger.info("Starting up Phonebook API...")
    
    try:
        seatable_client = SeaTableClient(
            base_url=Config.SEATABLE_BASE_URL,
            api_token=Config.SEATABLE_API_TOKEN,
            base_uuid=Config.SEATABLE_BASE_UUID,
            table_name=Config.SEATABLE_TABLE_NAME
        )
        
        connected = await seatable_client.get_base_token()
        if connected:
            logger.info("✅ Connected to SeaTable")
        else:
            logger.error("❌ Failed to connect to SeaTable")
            
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
    
    yield
    
    logger.info("Shutting down...")

app = FastAPI(title="Phonebook API", lifespan=lifespan)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели данных с Optional (разрешаем None)
class Employee(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    position: Optional[str] = None
    office: Optional[str] = None
    phone: Optional[str] = None
    internalPhone: Optional[str] = None
    management: Optional[str] = None
    structuralUnit: Optional[str] = None
    legalEntity: Optional[str] = None
    code: Optional[str] = None
    
    def dict(self, **kwargs):
        """При возврате заменяем None на пустые строки"""
        d = super().dict(**kwargs)
        return {k: (v if v is not None else '') for k, v in d.items()}

class EmployeesResponse(BaseModel):
    success: bool
    data: List[Employee]
    count: int
    error: Optional[str] = None

class FiltersResponse(BaseModel):
    success: bool
    managements: List[str] = []
    structuralUnits: List[str] = []
    legalEntities: List[str] = []
    error: Optional[str] = None

@app.get("/")
async def root():
    return {
        "message": "Phonebook API is running",
        "status": "ok",
        "endpoints": {
            "/api/employees": "GET - Get all employees",
            "/api/filters": "GET - Get filter options",
            "/api/health": "GET - Health check"
        }
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "API is running", "seatable_connected": seatable_client is not None}

@app.get("/api/employees")
async def get_employees():
    logger.info("GET /api/employees called")
    
    try:
        if seatable_client is None:
            return {
                "success": False,
                "data": [],
                "count": 0,
                "error": "SeaTable client not initialized"
            }
        
        employees_data = await seatable_client.get_all_employees()
        logger.info(f"Fetched {len(employees_data)} employees")
        
        # Создаем список Employee объектов
        employees = []
        for emp_data in employees_data:
            # Заменяем None на пустые строки при создании
            employee = Employee(
                id=emp_data.get('id') or '',
                name=emp_data.get('name') or '',
                position=emp_data.get('position') or '',
                office=emp_data.get('office') or '',
                phone=emp_data.get('phone') or '',
                internalPhone=emp_data.get('internalPhone') or '',
                management=emp_data.get('management') or '',
                structuralUnit=emp_data.get('structuralUnit') or '',
                legalEntity=emp_data.get('legalEntity') or '',
                code=emp_data.get('code') or ''
            )
            employees.append(employee)
        
        return {
            "success": True,
            "data": [e.dict() for e in employees],
            "count": len(employees),
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Error: {e}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "data": [],
            "count": 0,
            "error": str(e)
        }

@app.get("/api/filters")
async def get_filters():
    logger.info("GET /api/filters called")
    
    try:
        if seatable_client is None:
            return {
                "success": False,
                "managements": [],
                "structuralUnits": [],
                "legalEntities": [],
                "error": "SeaTable client not initialized"
            }
        
        employees_data = await seatable_client.get_all_employees()
        
        # Фильтруем пустые значения
        managements = list(set(
            e.get('management', '') for e in employees_data 
            if e.get('management') and e.get('management') != ''
        ))
        structural_units = list(set(
            e.get('structuralUnit', '') for e in employees_data 
            if e.get('structuralUnit') and e.get('structuralUnit') != ''
        ))
        legal_entities = list(set(
            e.get('legalEntity', '') for e in employees_data 
            if e.get('legalEntity') and e.get('legalEntity') != ''
        ))
        
        return {
            "success": True,
            "managements": sorted(managements),
            "structuralUnits": sorted(structural_units),
            "legalEntities": sorted(legal_entities),
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Error: {e}")
        return {
            "success": False,
            "managements": [],
            "structuralUnits": [],
            "legalEntities": [],
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")