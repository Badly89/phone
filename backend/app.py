from flask import Flask, jsonify
from flask_cors import CORS
from seatable_client import SeaTableClient
import os

app = Flask(__name__)
CORS(app)

# Инициализация клиента SeaTable
seatable_client = SeaTableClient()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is running', 'timezone': 'Asia/Yekaterinburg'})

@app.route('/api/employees', methods=['GET'])
def get_employees():
    try:
        employees = seatable_client.fetch_employees()
        return jsonify({'success': True, 'data': employees, 'count': len(employees)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/filters', methods=['GET'])
def get_filters():
    try:
        employees = seatable_client.fetch_employees()
        
        managements = list(set([e.get('management') for e in employees if e.get('management')]))
        structural_units = list(set([e.get('structuralUnit') for e in employees if e.get('structuralUnit')]))
        legal_entities = list(set([e.get('legalEntity') for e in employees if e.get('legalEntity')]))
        
        return jsonify({
            'success': True,
            'managements': sorted(managements),
            'structuralUnits': sorted(structural_units),
            'legalEntities': sorted(legal_entities)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)