// Добавьте в начало файла script.js после существующего кода

class PhoneDirectory {
    constructor(db, authSystem) {
        this.db = db;
        this.authSystem = authSystem;
        this.employees = [];
        this.filteredEmployees = [];
        this.currentUser = null;
        
        // DOM элементы
        this.employeesGrid = document.getElementById('employeesGrid');
        this.searchInput = document.getElementById('searchInput');
        this.departmentFilter = document.getElementById('departmentFilter');
        this.sortBy = document.getElementById('sortBy');
        this.clearSearchBtn = document.getElementById('clearSearch');
        this.totalCountSpan = document.getElementById('totalCount');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.noResultsDiv = document.getElementById('noResults');
        this.adminPanelBtn = document.getElementById('adminPanelBtn');
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        
        // Проверяем API сервер
        if (window.apiClient) {
            try {
                const isHealthy = await window.apiClient.healthCheck();
                if (isHealthy) {
                    console.log('API сервер доступен');
                    await this.db.loadFromAPI();
                }
            } catch (error) {
                console.warn('API сервер недоступен, используем локальные данные:', error);
            }
        }
        
        await this.loadEmployees();
        await this.loadDepartments();
    }
    
    // Заменить существующий метод loadEmployees на этот:

async loadEmployees() {
    try {
        this.showLoading(true);
        
        let employees = [];
        
        // Пытаемся загрузить из SeaTable
        if (window.seatableLoader) {
            try {
                const seatableData = await window.seatableLoader.loadEmployees();
                if (seatableData && seatableData.length > 0) {
                    employees = seatableData;
                    // Сохраняем в локальную базу
                    await this.db.clearAllData();
                    for (const emp of employees) {
                        await this.db.addEmployee(emp);
                    }
                    console.log(`Загружено ${employees.length} сотрудников из SeaTable`);
                }
            } catch (error) {
                console.warn('Ошибка загрузки из SeaTable:', error);
            }
        }
        
        // Если из SeaTable не загрузилось, берем из локальной базы
        if (employees.length === 0) {
            employees = await this.db.getAllEmployees();
            console.log(`Загружено ${employees.length} сотрудников из локальной базы`);
        }
        
        this.employees = employees;
        this.filteredEmployees = [...this.employees];
        
        this.updateTotalCount();
        this.renderEmployees();
        this.updateLastUpdateTime();
        
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        this.showError('Ошибка загрузки данных');
    } finally {
        this.showLoading(false);
    }
}
    
    async loadDepartments() {
        // Сначала пробуем получить через API
        let departments = [];
        
        if (window.apiClient && navigator.onLine) {
            try {
                departments = await window.apiClient.getDepartments();
            } catch (error) {
                console.warn('Ошибка загрузки отделов из API:', error);
            }
        }
        
        // Если API не дал результат, получаем из локальных данных
        if (departments.length === 0) {
            const uniqueDepts = new Set();
            this.employees.forEach(emp => {
                if (emp.department) uniqueDepts.add(emp.department);
            });
            departments = Array.from(uniqueDepts).sort();
        }
        
        // Заполняем select
        const select = this.departmentFilter;
        select.innerHTML = '<option value="all">Все отделы</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            select.appendChild(option);
        });
    }
    
    renderEmployees() {
        if (!this.employeesGrid) return;
        
        if (this.filteredEmployees.length === 0) {
            this.employeesGrid.innerHTML = '';
            this.noResultsDiv.style.display = 'block';
            return;
        }
        
        this.noResultsDiv.style.display = 'none';
        
        // Сортировка
        let sorted = [...this.filteredEmployees];
        const sortBy = this.sortBy.value;
        
        if (sortBy === 'name') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortBy === 'department') {
            sorted.sort((a, b) => (a.department || '').localeCompare(b.department || ''));
        } else if (sortBy === 'position') {
            sorted.sort((a, b) => (a.position || '').localeCompare(b.position || ''));
        }
        
        // Рендерим карточки
        this.employeesGrid.innerHTML = sorted.map(emp => this.renderEmployeeCard(emp)).join('');
        
        // Добавляем обработчики для кнопок
        document.querySelectorAll('.view-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                const employee = this.employees.find(emp => emp.id === id);
                if (employee) this.showContactModal(employee);
            });
        });
    }
    
    renderEmployeeCard(emp) {
        return `
            <div class="employee-card" data-id="${emp.id}">
                <div class="card-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="card-info">
                    <h3 class="employee-name">${this.escapeHtml(emp.name || '')}</h3>
                    <p class="employee-position">${this.escapeHtml(emp.position || '')}</p>
                    <p class="employee-department">
                        <i class="fas fa-building"></i> ${this.escapeHtml(emp.department || '')}
                    </p>
                    <p class="employee-phone">
                        <i class="fas fa-phone"></i> ${this.escapeHtml(emp.phone || '')}
                    </p>
                    ${emp.internalPhone ? `
                        <p class="employee-internal-phone">
                            <i class="fas fa-phone-alt"></i> доб. ${this.escapeHtml(emp.internalPhone)}
                        </p>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <button class="view-contact-btn" data-id="${emp.id}">
                        <i class="fas fa-envelope"></i> Контакты
                    </button>
                </div>
            </div>
        `;
    }
    
    showContactModal(emp) {
        const modal = document.getElementById('contactModal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <div class="contact-details">
                <div class="contact-header">
                    <i class="fas fa-user-circle fa-3x"></i>
                    <div>
                        <h3>${this.escapeHtml(emp.name || '')}</h3>
                        <p>${this.escapeHtml(emp.position || '')}</p>
                    </div>
                </div>
                
                <div class="contact-section">
                    <h4><i class="fas fa-phone-alt"></i> Контактная информация</h4>
                    <p><strong>Телефон:</strong> <a href="tel:${emp.phone}">${this.escapeHtml(emp.phone || '')}</a></p>
                    ${emp.internalPhone ? `<p><strong>Внутренний номер:</strong> ${this.escapeHtml(emp.internalPhone)}</p>` : ''}
                    ${emp.email ? `<p><strong>Email:</strong> <a href="mailto:${emp.email}">${this.escapeHtml(emp.email)}</a></p>` : ''}
                </div>
                
                <div class="contact-section">
                    <h4><i class="fas fa-building"></i> Организационная структура</h4>
                    <p><strong>Отдел:</strong> ${this.escapeHtml(emp.department || '')}</p>
                    ${emp.office ? `<p><strong>Кабинет:</strong> ${this.escapeHtml(emp.office)}</p>` : ''}
                    ${emp.workHours ? `<p><strong>Часы работы:</strong> ${this.escapeHtml(emp.workHours)}</p>` : ''}
                </div>
                
                ${emp.additional ? `
                    <div class="contact-section">
                        <h4><i class="fas fa-info-circle"></i> Дополнительно</h4>
                        <p>${this.escapeHtml(emp.additional)}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        modal.style.display = 'flex';
        
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }
    
    filterAndSearch() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const department = this.departmentFilter.value;
        
        this.filteredEmployees = this.employees.filter(emp => {
            const matchesSearch = !searchTerm || 
                (emp.name || '').toLowerCase().includes(searchTerm) ||
                (emp.position || '').toLowerCase().includes(searchTerm) ||
                (emp.department || '').toLowerCase().includes(searchTerm) ||
                (emp.phone || '').includes(searchTerm);
            
            const matchesDepartment = department === 'all' || emp.department === department;
            
            return matchesSearch && matchesDepartment;
        });
        
        this.renderEmployees();
        this.updateTotalCount(true);
    }
    
    updateTotalCount(filtered = false) {
        const count = filtered ? this.filteredEmployees.length : this.employees.length;
        if (this.totalCountSpan) {
            this.totalCountSpan.textContent = count;
        }
    }
    
    updateLastUpdateTime() {
        if (this.lastUpdateSpan) {
            const now = new Date();
            this.lastUpdateSpan.textContent = now.toLocaleString('ru-RU');
        }
    }
    
    showLoading(show) {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }
    
    showError(message) {
        console.error(message);
        // Можно добавить уведомление для пользователя
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    bindEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.filterAndSearch());
        }
        
        if (this.departmentFilter) {
            this.departmentFilter.addEventListener('change', () => this.filterAndSearch());
        }
        
        if (this.sortBy) {
            this.sortBy.addEventListener('change', () => this.renderEmployees());
        }
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.filterAndSearch();
                this.clearSearchBtn.style.display = 'none';
            });
            
            this.searchInput.addEventListener('input', () => {
                this.clearSearchBtn.style.display = this.searchInput.value ? 'flex' : 'none';
            });
        }
        
        if (this.adminPanelBtn) {
            this.adminPanelBtn.addEventListener('click', () => {
                if (window.adminPanel) {
                    window.adminPanel.showAdminModal();
                }
            });
        }
    }
}