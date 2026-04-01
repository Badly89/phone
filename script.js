/**
 * Основной класс приложения - отображение справочника
 */
class PhoneDirectory {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;
    this.employees = [];
    this.filteredEmployees = [];
    this.currentFilters = {
      search: '',
      department: 'all',
      sortBy: 'name'
    };

    this.init();
  }

  /**
   * Инициализация приложения
   */
  async init() {
    await this.db.init();
    await this.db.initDemoData();

    this.cacheElements();
    this.bindEvents();
    this.updateLastUpdateDate();
    await this.refreshData();
    this.updateUIForUser();
  }

  /**
   * Кэширование DOM элементов
   */
  cacheElements() {
    this.grid = document.getElementById('employeesGrid');
    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearch');
    this.departmentFilter = document.getElementById('departmentFilter');
    this.sortBy = document.getElementById('sortBy');
    this.noResultsDiv = document.getElementById('noResults');
    this.loadingSpinner = document.getElementById('loadingSpinner');
    this.totalCountSpan = document.getElementById('totalCount');
    this.modal = document.getElementById('contactModal');
    this.modalBody = document.getElementById('modalBody');
    this.modalClose = document.querySelector('.modal-close');
    this.userInfo = document.getElementById('userInfo');
  }

  /**
   * Привязка обработчиков событий
   */
  bindEvents() {
    // Поиск с debounce
    let searchTimeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentFilters.search = e.target.value;
        this.updateClearButton();
        this.filterAndRender();
      }, 300);
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.currentFilters.search = '';
      this.updateClearButton();
      this.filterAndRender();
      this.searchInput.focus();
    });

    this.departmentFilter.addEventListener('change', (e) => {
      this.currentFilters.department = e.target.value;
      this.filterAndRender();
    });

    this.sortBy.addEventListener('change', (e) => {
      this.currentFilters.sortBy = e.target.value;
      this.filterAndRender();
    });

    // Закрытие модального окна
    this.modalClose.addEventListener('click', () => this.closeModal());
    window.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.closeModal();
      }
    });
  }

  /**
   * Обновление UI в зависимости от авторизации
   */
  updateUIForUser() {
    const user = this.auth.getCurrentUser();
    if (user && this.userInfo) {
      const roleNames = {
        'admin': 'Администратор',
        'editor': 'Редактор',
        'viewer': 'Наблюдатель'
      };
      this.userInfo.style.display = 'flex';
      this.userInfo.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <span>${this.escapeHtml(user.fullName || user.username)}</span>
                <span class="user-role">${roleNames[user.role]}</span>
                <button id="logoutBtn" title="Выйти">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }
    } else if (this.userInfo) {
      this.userInfo.style.display = 'none';
    }
  }

  /**
   * Выход из системы
   */
  async logout() {
    await this.auth.logout();
    this.updateUIForUser();
    alert('Вы вышли из системы');
  }

  /**
   * Обновление кнопки очистки поиска
   */
  updateClearButton() {
    this.clearSearchBtn.style.display = this.searchInput.value ? 'block' : 'none';
  }

  /**
   * Обновление данных
   */
  async refreshData() {
    this.showLoading();
    this.employees = await this.db.getAllEmployees();
    await this.populateDepartments();
    this.filterAndRender();
    this.hideLoading();
  }

  /**
   * Заполнение списка отделов (для фильтра)
   */
  async populateDepartments() {
    // Получаем уникальные отделы из сотрудников
    const departments = [...new Set(this.employees.map(emp =>
      emp.structuralUnit || emp.department
    ).filter(Boolean))].sort();

    const currentValue = this.departmentFilter.value;

    this.departmentFilter.innerHTML = '<option value="all">Все отделы</option>' +
      departments.map(dept => `<option value="${this.escapeHtml(dept)}">${this.escapeHtml(dept)}</option>`).join('');

    if (currentValue && departments.includes(currentValue)) {
      this.departmentFilter.value = currentValue;
    }
  }

  /**
   * Фильтрация и отрисовка
   */
  filterAndRender() {
    this.showLoading();

    setTimeout(() => {
      this.applyFilters();
      this.applySorting();
      this.render();
      this.updateTotalCount();
      this.hideLoading();
    }, 100);
  }

  /**
   * Применение фильтров
   */
  applyFilters() {
    let filtered = [...this.employees];

    // Поиск по тексту
    if (this.currentFilters.search) {
      const searchTerm = this.currentFilters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.position.toLowerCase().includes(searchTerm) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm)) ||
        (emp.structuralUnit && emp.structuralUnit.toLowerCase().includes(searchTerm)) ||
        (emp.sector && emp.sector.toLowerCase().includes(searchTerm)) ||
        (emp.legalEntity && emp.legalEntity.toLowerCase().includes(searchTerm)) ||
        emp.phone.includes(searchTerm) ||
        (emp.internalPhone && emp.internalPhone.includes(searchTerm)) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm))
      );
    }

    // Фильтр по отделу/структурному подразделению
    if (this.currentFilters.department !== 'all') {
      filtered = filtered.filter(emp =>
        emp.structuralUnit === this.currentFilters.department ||
        emp.department === this.currentFilters.department
      );
    }

    this.filteredEmployees = filtered;
  }

  /**
   * Применение сортировки
   */
  applySorting() {
    const sortBy = this.currentFilters.sortBy;

    switch (sortBy) {
      case 'name':
        this.filteredEmployees.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        break;
      case 'department':
        this.filteredEmployees.sort((a, b) => {
          const deptA = a.structuralUnit || a.department || '';
          const deptB = b.structuralUnit || b.department || '';
          return deptA.localeCompare(deptB, 'ru');
        });
        break;
      case 'position':
        this.filteredEmployees.sort((a, b) => a.position.localeCompare(b.position, 'ru'));
        break;
    }
  }

  /**
   * Отрисовка карточек сотрудников
   */
  render() {
    if (this.filteredEmployees.length === 0) {
      this.grid.innerHTML = '';
      this.noResultsDiv.style.display = 'block';
      return;
    }

    this.noResultsDiv.style.display = 'none';
    this.grid.innerHTML = this.filteredEmployees.map(emp => this.createCard(emp)).join('');

    document.querySelectorAll('.employee-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        const employee = this.employees.find(emp => emp.id === id);
        if (employee) this.showModal(employee);
      });
    });
  }

  /**
   * Создание карточки сотрудника
   */
  createCard(employee) {
    const initials = employee.name.split(' ').map(n => n[0]).join('');
    const avatarColor = this.getAvatarColor(employee.id);

    // Форматируем отображение телефонов
    const phoneDisplay = employee.internalPhone
      ? `${employee.phone} (вн. ${employee.internalPhone})`
      : employee.phone;

    // Определяем основное подразделение для отображения
    const mainDepartment = employee.structuralUnit || employee.department || '';

    return `
            <div class="employee-card" data-id="${employee.id}">
                <div class="card-header">
                    <div class="avatar" style="background: ${avatarColor}">
                        ${initials}
                    </div>
                    <div class="employee-info">
                        <div class="employee-name">${this.escapeHtml(employee.name)}</div>
                        <div class="employee-position">${this.escapeHtml(employee.position)}</div>
                        ${mainDepartment ? `
                        <span class="employee-department">
                            <i class="fas fa-building"></i> ${this.escapeHtml(mainDepartment)}
                        </span>
                        ` : ''}
                    </div>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <a href="tel:${employee.phone}">${this.escapeHtml(phoneDisplay)}</a>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <a href="mailto:${employee.email}">${employee.email || 'Не указан'}</a>
                    </div>
                    ${employee.legalEntity ? `
                    <div class="detail-item">
                        <i class="fas fa-building"></i>
                        <span>${this.escapeHtml(employee.legalEntity)}</span>
                    </div>
                    ` : ''}
                    <div class="employee-details-extended">
                        ${employee.sector ? `
                        <div class="detail-item-small">
                            <i class="fas fa-layer-group"></i>
                            <span>${this.escapeHtml(employee.sector)}</span>
                        </div>
                        ` : ''}
                        ${employee.office ? `
                        <div class="detail-item-small">
                            <i class="fas fa-door-open"></i>
                            <span>${this.escapeHtml(employee.office)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Показ модального окна с деталями сотрудника
   */
  showModal(employee) {
    const initials = employee.name.split(' ').map(n => n[0]).join('');
    const avatarColor = this.getAvatarColor(employee.id);

    const phoneDisplay = employee.internalPhone
      ? `${employee.phone} (внутренний: ${employee.internalPhone})`
      : employee.phone;

    const mainDepartment = employee.structuralUnit || employee.department || '';

    const modalHTML = `
            <div class="contact-profile">
                <div class="contact-avatar-large" style="background: ${avatarColor}">
                    ${initials}
                </div>
                <div class="contact-name-large">${this.escapeHtml(employee.name)}</div>
                <div class="contact-position-large">${this.escapeHtml(employee.position)}</div>
                ${mainDepartment ? `
                <div class="contact-department-badge">
                    <i class="fas fa-building"></i> ${this.escapeHtml(mainDepartment)}
                </div>
                ` : ''}
            </div>
            
            <div class="contact-section">
                <div class="contact-section-title">
                    <i class="fas fa-phone-alt"></i>
                    Контактные данные
                </div>
                <div class="contact-info-grid">
                    <div class="contact-info-item" data-copy="phone">
                        <div class="contact-info-icon">
                            <i class="fas fa-phone"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Телефон</div>
                            <div class="contact-info-value">
                                <a href="tel:${employee.phone}">${this.escapeHtml(phoneDisplay)}</a>
                            </div>
                        </div>
                    </div>
                    ${employee.internalPhone ? `
                    <div class="contact-info-item" data-copy="internalPhone">
                        <div class="contact-info-icon">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Внутренний номер</div>
                            <div class="contact-info-value">${this.escapeHtml(employee.internalPhone)}</div>
                        </div>
                    </div>
                    ` : ''}
                    ${employee.email ? `
                    <div class="contact-info-item" data-copy="email">
                        <div class="contact-info-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Email</div>
                            <div class="contact-info-value">
                                <a href="mailto:${employee.email}">${this.escapeHtml(employee.email)}</a>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="contact-section">
                <div class="contact-section-title">
                    <i class="fas fa-building"></i>
                    Организационная структура
                </div>
                <div class="contact-info-grid">
                    ${employee.legalEntity ? `
                    <div class="contact-info-item">
                        <div class="contact-info-icon">
                            <i class="fas fa-building"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Юридическое лицо</div>
                            <div class="contact-info-value">${this.escapeHtml(employee.legalEntity)}</div>
                        </div>
                    </div>
                    ` : ''}
                    ${mainDepartment ? `
                    <div class="contact-info-item">
                        <div class="contact-info-icon">
                            <i class="fas fa-sitemap"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Структурное подразделение</div>
                            <div class="contact-info-value">${this.escapeHtml(mainDepartment)}</div>
                        </div>
                    </div>
                    ` : ''}
                    ${employee.sector ? `
                    <div class="contact-info-item">
                        <div class="contact-info-icon">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Отдел/Сектор</div>
                            <div class="contact-info-value">${this.escapeHtml(employee.sector)}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="contact-section">
                <div class="contact-section-title">
                    <i class="fas fa-info-circle"></i>
                    Рабочая информация
                </div>
                <div class="contact-info-grid">
                    ${employee.office ? `
                    <div class="contact-info-item" data-copy="office">
                        <div class="contact-info-icon">
                            <i class="fas fa-door-open"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Кабинет</div>
                            <div class="contact-info-value">${this.escapeHtml(employee.office)}</div>
                        </div>
                    </div>
                    ` : ''}
                    ${employee.workHours ? `
                    <div class="contact-info-item">
                        <div class="contact-info-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-label">Часы работы</div>
                            <div class="contact-info-value">${this.escapeHtml(employee.workHours)}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${employee.additional ? `
            <div class="contact-section">
                <div class="contact-section-title">
                    <i class="fas fa-sticky-note"></i>
                    Дополнительная информация
                </div>
                <div class="contact-info-grid">
                    <div class="contact-info-item">
                        <div class="contact-info-icon">
                            <i class="fas fa-comment"></i>
                        </div>
                        <div class="contact-info-content">
                            <div class="contact-info-value">${this.escapeHtml(employee.additional)}</div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div class="contact-actions">
                <button class="contact-action-btn call" onclick="window.location.href='tel:${employee.phone}'">
                    <i class="fas fa-phone"></i> Позвонить
                </button>
                ${employee.email ? `
                <button class="contact-action-btn email" onclick="window.location.href='mailto:${employee.email}'">
                    <i class="fas fa-envelope"></i> Написать
                </button>
                ` : ''}
                <button class="contact-action-btn copy" onclick="window.copyFullContactInfo('${this.escapeHtml(employee.phone)}', '${this.escapeHtml(employee.internalPhone || '')}', '${this.escapeHtml(employee.email || '')}', '${this.escapeHtml(employee.name)}', '${this.escapeHtml(employee.position)}', '${this.escapeHtml(employee.legalEntity || '')}', '${this.escapeHtml(mainDepartment)}', '${this.escapeHtml(employee.sector || '')}', '${this.escapeHtml(employee.office || '')}')">
                    <i class="fas fa-copy"></i> Скопировать всё
                </button>
            </div>
        `;

    this.modalBody.innerHTML = modalHTML;
    this.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    this.setupCopyHandlers(employee);
  }

  /**
   * Настройка обработчиков копирования
   */
  setupCopyHandlers(employee) {
    const copyItems = document.querySelectorAll('[data-copy]');
    copyItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        let textToCopy = '';
        let fieldName = '';
        const type = item.dataset.copy;

        switch (type) {
          case 'phone':
            textToCopy = employee.phone;
            fieldName = 'Телефон';
            break;
          case 'internalPhone':
            textToCopy = employee.internalPhone;
            fieldName = 'Внутренний номер';
            break;
          case 'email':
            textToCopy = employee.email;
            fieldName = 'Email';
            break;
          case 'office':
            textToCopy = employee.office;
            fieldName = 'Кабинет';
            break;
        }

        if (textToCopy) {
          this.copyToClipboard(textToCopy, fieldName);
        }
      });
    });
  }

  /**
   * Копирование в буфер обмена с уведомлением
   */
  copyToClipboard(text, fieldName) {
    navigator.clipboard.writeText(text).then(() => {
      this.showCopyNotification(`${fieldName} скопирован!`);
    }).catch(() => {
      // Fallback для старых браузеров
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showCopyNotification(`${fieldName} скопирован!`);
    });
  }

  /**
   * Показ уведомления о копировании
   */
  showCopyNotification(message) {
    const existing = document.querySelector('.copy-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * Закрытие модального окна
   */
  closeModal() {
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
   * Обновление счетчика
   */
  updateTotalCount() {
    this.totalCountSpan.textContent = this.filteredEmployees.length;
  }

  /**
   * Обновление даты последнего обновления
   */
  updateLastUpdateDate() {
    const date = new Date();
    const formattedDate = date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const lastUpdateSpan = document.getElementById('lastUpdate');
    if (lastUpdateSpan) {
      lastUpdateSpan.textContent = formattedDate;
    }
  }

  /**
   * Показ загрузки
   */
  showLoading() {
    this.loadingSpinner.style.display = 'block';
    this.grid.style.opacity = '0.5';
  }

  /**
   * Скрытие загрузки
   */
  hideLoading() {
    this.loadingSpinner.style.display = 'none';
    this.grid.style.opacity = '1';
  }

  /**
   * Получение цвета аватара
   */
  getAvatarColor(id) {
    const colors = [
      'linear-gradient(135deg, #3498db, #2c3e50)',
      'linear-gradient(135deg, #e74c3c, #c0392b)',
      'linear-gradient(135deg, #2ecc71, #27ae60)',
      'linear-gradient(135deg, #f39c12, #e67e22)',
      'linear-gradient(135deg, #9b59b6, #8e44ad)',
      'linear-gradient(135deg, #1abc9c, #16a085)',
      'linear-gradient(135deg, #e84393, #c2185b)',
      'linear-gradient(135deg, #00b894, #009432)'
    ];
    return colors[id % colors.length];
  }

  /**
   * Экранирование HTML
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КОНТАКТОВ ==========

/**
 * Глобальная функция для копирования всей контактной информации
 */
window.copyFullContactInfo = function (phone, internalPhone, email, name, position, legalEntity, structuralUnit, sector, office) {
  let contactText = `═══════════════════════════════════\n`;
  contactText += `📞 КОНТАКТНАЯ ИНФОРМАЦИЯ\n`;
  contactText += `═══════════════════════════════════\n\n`;
  contactText += `👤 ФИО: ${name}\n`;
  contactText += `💼 Должность: ${position}\n\n`;
  contactText += `📱 Телефон: ${phone}\n`;
  if (internalPhone) {
    contactText += `📞 Внутренний: ${internalPhone}\n`;
  }
  if (email) {
    contactText += `✉️ Email: ${email}\n\n`;
  }
  contactText += `🏢 Организационная структура:\n`;
  if (legalEntity) contactText += `   Юридическое лицо: ${legalEntity}\n`;
  if (structuralUnit) contactText += `   Структурное подразделение: ${structuralUnit}\n`;
  if (sector) contactText += `   Отдел/Сектор: ${sector}\n`;
  if (office) contactText += `   Кабинет: ${office}\n\n`;
  contactText += `═══════════════════════════════════\n`;
  contactText += `Скопировано из телефонного справочника\n`;
  contactText += `Администрации города\n`;

  navigator.clipboard.writeText(contactText).then(() => {
    showCopySuccessNotification('Вся контактная информация скопирована!');
  }).catch(() => {
    alert('Копирование не поддерживается. Вот информация:\n\n' + contactText);
  });
};

/**
 * Функция для копирования отдельного поля
 */
window.copyToClipboard = function (text, fieldName) {
  navigator.clipboard.writeText(text).then(() => {
    showCopySuccessNotification(`${fieldName} скопирован!`);
  }).catch(() => {
    alert(`${fieldName}: ${text}`);
  });
};

/**
 * Показ уведомления об успешном копировании
 */
function showCopySuccessNotification(message) {
  const existing = document.querySelector('.copy-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}