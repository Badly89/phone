class PhoneDirectory {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        
        this.employeesGrid = document.getElementById('employeesGrid');
        this.searchInput = document.getElementById('searchInput');
        this.departmentFilter = document.getElementById('departmentFilter');
        this.structuralUnitFilter = document.getElementById('structuralUnitFilter');
        this.legalEntityFilter = document.getElementById('legalEntityFilter');
        this.sortBy = document.getElementById('sortBy');
        this.resetFiltersBtn = document.getElementById('resetFiltersBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.clearSearchBtn = document.getElementById('clearSearch');
        this.totalCountSpan = document.getElementById('totalCount');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.noResultsDiv = document.getElementById('noResults');
        this.syncIndicator = document.getElementById('syncIndicator');
        this.modal = document.getElementById('contactModal');
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadEmployees();
        this.initModal();
    }

    initModal() {
        if (!this.modal) return;
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.onclick = () => this.closeModal();
        this.modal.onclick = (e) => { if (e.target === this.modal) this.closeModal(); };
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) this.closeModal();
        });
    }

    lockBodyScroll() {
        document.body.classList.add('modal-open');
    }

    unlockBodyScroll() {
        document.body.classList.remove('modal-open');
    }

    async loadEmployees() {
        this.showLoading(true);
        this.showSync(true);
        try {
            const employees = await window.seatableLoader.loadEmployees();
            if (employees && employees.length > 0) {
                this.employees = employees;
                this.filteredEmployees = [...this.employees];
                this.updateLastUpdateTime();
                console.log('Загружено:', this.employees.length);
            } else {
                this.employees = [];
                this.filteredEmployees = [];
            }
            this.updateFilters();
            this.renderEmployees();
            this.updateTotalCount();
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Ошибка загрузки данных');
        } finally {
            this.showLoading(false);
            this.showSync(false);
        }
    }

    updateFilters() {
        const managements = [...new Set(this.employees.map(e => e.management).filter(Boolean))].sort();
        const deptSelect = this.departmentFilter;
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="all">Все отделы</option>';
            managements.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                deptSelect.appendChild(option);
            });
        }
        
        const structuralUnits = [...new Set(this.employees.map(e => e.structuralUnit).filter(Boolean))].sort();
        const structSelect = this.structuralUnitFilter;
        if (structSelect) {
            structSelect.innerHTML = '<option value="all">Все структурные подразделения</option>';
            structuralUnits.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                structSelect.appendChild(option);
            });
        }
        
        const legalEntities = [...new Set(this.employees.map(e => e.legalEntity).filter(Boolean))].sort();
        const legalSelect = this.legalEntityFilter;
        if (legalSelect) {
            legalSelect.innerHTML = '<option value="all">Все юрлица</option>';
            legalEntities.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                legalSelect.appendChild(option);
            });
        }
    }

    renderEmployees() {
        if (!this.employeesGrid) return;
        if (this.filteredEmployees.length === 0) {
            this.employeesGrid.innerHTML = '';
            if (this.noResultsDiv) this.noResultsDiv.style.display = 'block';
            return;
        }
        if (this.noResultsDiv) this.noResultsDiv.style.display = 'none';
        
        let sorted = [...this.filteredEmployees];
        const sortBy = this.sortBy ? this.sortBy.value : 'name';
        if (sortBy === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (sortBy === 'position') sorted.sort((a, b) => (a.position || '').localeCompare(b.position || ''));
        else if (sortBy === 'department') sorted.sort((a, b) => (a.management || '').localeCompare(b.management || ''));
        
        this.employeesGrid.innerHTML = sorted.map(emp => `
            <div class="employee-card" data-id="${emp.id}">
                <div class="card-avatar"><i class="fas fa-user-circle"></i></div>
                <div class="card-info">
                    <h3 class="employee-name">${this.escapeHtml(emp.name || 'Без имени')}</h3>
                    <p class="employee-position">${this.escapeHtml(emp.position || '')}</p>
                    ${emp.management ? `<p class="employee-management"><i class="fas fa-building"></i> ${this.escapeHtml(emp.management)}</p>` : ''}
                    ${emp.structuralUnit ? `<p class="employee-structural-unit"><i class="fas fa-sitemap"></i> ${this.escapeHtml(emp.structuralUnit)}</p>` : ''}
                    ${emp.legalEntity ? `<p class="employee-legal-entity"><i class="fas fa-balance-scale"></i> ${this.escapeHtml(emp.legalEntity)}</p>` : ''}
                </div>
                <div class="click-hint"><i class="fas fa-hand-pointer"></i> Нажмите для подробностей</div>
            </div>
        `).join('');
        
        document.querySelectorAll('.employee-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                const employee = this.employees.find(emp => emp.id === id);
                if (employee) this.openModal(employee);
            });
        });
    }

    openModal(emp) {
        if (!this.modal) return;
        
        this.lockBodyScroll();
        
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="contact-profile">
                    <div class="contact-avatar"><i class="fas fa-user-circle"></i></div>
                    <h3 class="contact-name">${this.escapeHtml(emp.name || '')}</h3>
                    <p class="contact-position">${this.escapeHtml(emp.position || '')}</p>
                </div>
                
                <div class="contact-section">
                    <div class="contact-section-title"><i class="fas fa-building"></i> Структура подразделения</div>
                    ${emp.management ? `<div class="contact-info-item"><div class="contact-info-icon"><i class="fas fa-building"></i></div><div><div class="contact-info-label">Управление</div><div class="contact-info-value">${this.escapeHtml(emp.management)}</div></div></div>` : ''}
                    ${emp.structuralUnit ? `<div class="contact-info-item"><div class="contact-info-icon"><i class="fas fa-sitemap"></i></div><div><div class="contact-info-label">Структурное подразделение</div><div class="contact-info-value">${this.escapeHtml(emp.structuralUnit)}</div></div></div>` : ''}
                    ${emp.legalEntity ? `<div class="contact-info-item"><div class="contact-info-icon"><i class="fas fa-balance-scale"></i></div><div><div class="contact-info-label">Юридическое лицо</div><div class="contact-info-value">${this.escapeHtml(emp.legalEntity)}</div></div></div>` : ''}
                </div>
                
                <div class="contact-section">
                    <div class="contact-section-title"><i class="fas fa-phone-alt"></i> Контактная информация</div>
                    ${emp.phone ? `<div class="contact-info-item"><div class="contact-info-icon"><i class="fas fa-phone"></i></div><div><div class="contact-info-label">Телефон</div><div class="contact-info-value"><a href="tel:${emp.phone}">${this.escapeHtml(emp.phone)}</a></div></div></div>` : ''}
                    ${emp.internalPhone ? `<div class="contact-info-item"><div class="contact-info-icon"><i class="fas fa-phone-alt"></i></div><div><div class="contact-info-label">Внутренний номер</div><div class="contact-info-value">${this.escapeHtml(emp.internalPhone)}</div></div></div>` : ''}
                </div>
                
                                
                <div class="contact-actions">
                    ${emp.phone ? `<button class="contact-action-btn call" onclick="window.location.href='tel:${emp.phone}'"><i class="fas fa-phone"></i> Позвонить</button>` : ''}
                    <button class="contact-action-btn close" onclick="window.phoneDirectory?.closeModal()"><i class="fas fa-times"></i> Закрыть</button>
                </div>
            `;
        }
        this.modal.classList.add('active');
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
            this.unlockBodyScroll();
        }
    }

    filterAndSearch() {
        const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
        const department = this.departmentFilter ? this.departmentFilter.value : 'all';
        const structuralUnit = this.structuralUnitFilter ? this.structuralUnitFilter.value : 'all';
        const legalEntity = this.legalEntityFilter ? this.legalEntityFilter.value : 'all';
        
        this.filteredEmployees = this.employees.filter(emp => {
            const searchableText = [emp.name, emp.position, emp.management, emp.structuralUnit, emp.legalEntity, emp.phone].filter(Boolean).join(' ').toLowerCase();
            const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
            const matchesDept = department === 'all' || emp.management === department;
            const matchesStruct = structuralUnit === 'all' || emp.structuralUnit === structuralUnit;
            const matchesLegal = legalEntity === 'all' || emp.legalEntity === legalEntity;
            return matchesSearch && matchesDept && matchesStruct && matchesLegal;
        });
        
        this.renderEmployees();
        this.updateTotalCount();
    }

    resetFilters() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.departmentFilter) this.departmentFilter.value = 'all';
        if (this.structuralUnitFilter) this.structuralUnitFilter.value = 'all';
        if (this.legalEntityFilter) this.legalEntityFilter.value = 'all';
        if (this.sortBy) this.sortBy.value = 'name';
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
        this.filterAndSearch();
    }

    updateTotalCount() {
        if (this.totalCountSpan) this.totalCountSpan.textContent = this.filteredEmployees.length;
    }

    updateLastUpdateTime() {
        if (this.lastUpdateSpan) this.lastUpdateSpan.textContent = new Date().toLocaleString('ru-RU');
    }

    showLoading(show) {
        if (this.loadingSpinner) this.loadingSpinner.style.display = show ? 'flex' : 'none';
    }

    showSync(show) {
        if (this.syncIndicator) this.syncIndicator.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        if (this.noResultsDiv) {
            this.noResultsDiv.style.display = 'block';
            this.noResultsDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${this.escapeHtml(message)}</p><button onclick="window.phoneDirectory?.loadEmployees()" class="btn-export" style="margin-top:15px;"><i class="fas fa-sync-alt"></i> Повторить</button>`;
        }
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
            this.searchInput.addEventListener('input', () => {
                if (this.clearSearchBtn) this.clearSearchBtn.style.display = this.searchInput.value ? 'flex' : 'none';
            });
        }
        if (this.departmentFilter) this.departmentFilter.addEventListener('change', () => this.filterAndSearch());
        if (this.structuralUnitFilter) this.structuralUnitFilter.addEventListener('change', () => this.filterAndSearch());
        if (this.legalEntityFilter) this.legalEntityFilter.addEventListener('change', () => this.filterAndSearch());
        if (this.sortBy) this.sortBy.addEventListener('change', () => this.renderEmployees());
        if (this.resetFiltersBtn) this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        if (this.refreshBtn) this.refreshBtn.addEventListener('click', () => this.loadEmployees());
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                if (this.searchInput) {
                    this.searchInput.value = '';
                    this.filterAndSearch();
                    this.clearSearchBtn.style.display = 'none';
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.phoneDirectory = new PhoneDirectory();
});