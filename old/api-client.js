// api-client.js
// Клиент для работы с Python API сервером

class APIClient {
    constructor(baseUrl = 'http://localhost:5000') {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    async getAllEmployees() {
        const result = await this.request('/api/employees');
        if (result.success) {
            return result.data;
        }
        throw new Error(result.error);
    }

    async getEmployee(id) {
        const result = await this.request(`/api/employees/${id}`);
        if (result.success) {
            return result.data;
        }
        throw new Error(result.error);
    }

    async getDepartments() {
        const result = await this.request('/api/departments');
        if (result.success) {
            return result.data;
        }
        throw new Error(result.error);
    }

    async healthCheck() {
        const result = await this.request('/api/health');
        return result.status === 'ok';
    }
}

// Создаем глобальный экземпляр
window.apiClient = new APIClient('http://localhost:5000');