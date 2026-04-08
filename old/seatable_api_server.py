from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)  # Разрешаем запросы с фронтенда

# Конфигурация SeaTable
SEATABLE_CONFIG = {
    "api_token": "0d587e5bfac8f558d0a908d871c50db1fee0d047",
    "base_uuid": "572d2646-73b9-4a2f-bd19-03ca42b4ceef",
    "base_url": "https://ditable.yanao.ru",
    "table_name": "Справочник телефонов"
}

class SeaTableClient:
    def __init__(self, config):
        self.config = config
        self.base_token = None
    
    def get_base_token(self):
        """Получает Base-Token"""
        url = f"{self.config['base_url']}/api/v2.1/dtable/app-access-token/"
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {self.config['api_token']}"
        }
        
        response = requests.get(url, headers=headers, params={"exp": "3d"})
        if response.status_code == 200:
            data = response.json()
            self.base_token = data["access_token"]
            return True
        return False
    
    def get_all_employees(self):
        """Получает всех сотрудников из SeaTable"""
        if not self.base_token:
            if not self.get_base_token():
                return None
        
        url = f"{self.config['base_url']}/api-gateway/api/v2/dtables/{self.config['base_uuid']}/rows/"
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {self.base_token}"
        }
        params = {
            "table_name": self.config['table_name'],
            "limit": 1000
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return self._map_rows_to_employees(data.get('rows', []))
        return None
    
    def _map_rows_to_employees(self, rows):
        """Преобразует строки из SeaTable в формат для фронтенда"""
        employees = []
        for row in rows:
            employee = {
                "id": row.get('_id', ''),
                "name": row.get('ФИО') or row.get('Name') or row.get('name') or '',
                "position": row.get('Должность') or row.get('Position') or '',
                "department": row.get('Отдел') or row.get('Department') or '',
                "phone": row.get('Телефон') or row.get('Phone') or row.get('Мобильный телефон') or '',
                "internalPhone": row.get('Внутренний номер') or row.get('InternalPhone') or '',
                "email": row.get('Email') or '',
                "office": row.get('Кабинет') or row.get('Office') or '',
                "workHours": row.get('Часы работы') or row.get('WorkHours') or '',
                "additional": row.get('Дополнительная информация') or '',
                "legalEntity": row.get('Юридическое лицо') or '',
                "structuralUnit": row.get('Структурное подразделение') or '',
                "sector": row.get('Отдел/Сектор') or ''
            }
            employees.append(employee)
        return employees

# Создаем клиент
seatable_client = SeaTableClient(SEATABLE_CONFIG)

@app.route('/api/employees', methods=['GET'])
def get_employees():
    """API endpoint для получения списка сотрудников"""
    try:
        employees = seatable_client.get_all_employees()
        if employees is not None:
            return jsonify({
                "success": True,
                "data": employees,
                "count": len(employees)
            })
        else:
            return jsonify({
                "success": False,
                "error": "Не удалось получить данные из SeaTable"
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/employees/<employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Получение одного сотрудника по ID"""
    try:
        employees = seatable_client.get_all_employees()
        if employees:
            for emp in employees:
                if emp['id'] == employee_id:
                    return jsonify({"success": True, "data": emp})
        return jsonify({"success": False, "error": "Сотрудник не найден"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Получение списка отделов"""
    try:
        employees = seatable_client.get_all_employees()
        if employees:
            departments = list(set([emp['department'] for emp in employees if emp['department']]))
            departments.sort()
            return jsonify({"success": True, "data": departments})
        return jsonify({"success": False, "error": "Нет данных"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка работоспособности API"""
    return jsonify({"status": "ok", "message": "API сервер работает"})

if __name__ == '__main__':
    print("=" * 50)
    print("SeaTable API Server запущен")
    print(f"Адрес: http://localhost:5000")
    print(f"Endpoint: /api/employees")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)