/**
 * Класс для управления административной панелью
 */
class AdminPanel {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;
    this.currentEmployeeId = null;
    this.init();
  }

  /**
   * Инициализация админ-панели
   */
  async init() {
    await this.db.init();
    await this.db.initDemoData();

    this.cacheElements();
    this.bindEvents();
    this.updateUserInfo();

    // Загружаем данные только если есть активный пользователь
    if (this.auth.getCurrentUser()) {
      await this.loadAdminTable();
      await this.loadDepartmentsList();
      await this.loadUsersList();
      await this.loadSettings();
      await this.loadHistory();
      await this.checkSeaTableConnection();
    }
  }

  /**
   * Кэширование DOM элементов
   */
  cacheElements() {
    this.adminPanelBtn = document.getElementById('adminPanelBtn');
    this.adminModal = document.getElementById('adminModal');
    this.adminCloseBtns = document.querySelectorAll('.admin-close, .modal-close');
    this.addEmployeeBtn = document.getElementById('addEmployeeBtn');
    this.employeeFormModal = document.getElementById('employeeFormModal');
    this.employeeForm = document.getElementById('employeeForm');
    this.formTitle = document.getElementById('formTitle');
    this.formCloseBtns = document.querySelectorAll('.form-close, .form-cancel');
    this.adminTableBody = document.getElementById('adminTableBody');
    this.departmentsList = document.getElementById('departmentsList');
    this.addDepartmentBtn = document.getElementById('addDepartmentBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importDataBtn = document.getElementById('importDataBtn');
    this.backupDataBtn = document.getElementById('backupDataBtn');
    this.restoreDataBtn = document.getElementById('restoreDataBtn');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.requireAuth = document.getElementById('requireAuth');
    this.orgName = document.getElementById('orgName');
    this.userInfo = document.getElementById('userInfo');

    // Элементы SeaTable
    this.connectSeaTableBtn = document.getElementById('connectSeaTableBtn');
    this.syncSeaTableBtn = document.getElementById('syncSeaTableBtn');
    this.disconnectSeaTableBtn = document.getElementById('disconnectSeaTableBtn');
    this.seatableServerInput = document.getElementById('seatableServer');

    // Элементы управления пользователями
    this.usersTableBody = document.getElementById('usersTableBody');
    this.addUserBtn = document.getElementById('addUserBtn');
    this.changePasswordBtn = document.getElementById('changePasswordBtn');
    this.userFormModal = document.getElementById('userFormModal');
    this.userForm = document.getElementById('userForm');

    // Tabs
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
  }

  /**
   * Привязка обработчиков событий
   */
  bindEvents() {
    // Открытие админ-панели
    if (this.adminPanelBtn) {
      this.adminPanelBtn.addEventListener('click', async () => {
        console.log('🔘 Кнопка админ-панели нажата');
        const currentUser = this.auth.getCurrentUser();

        if (!currentUser) {
          if (window.loginModal) {
            window.loginModal.open();
          } else {
            console.error('loginModal не найден');
            alert('Ошибка: система авторизации не загружена');
          }
        } else {
          await this.openAdminPanel();
        }
      });
    }

    // Закрытие админ-панели
    this.adminCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeAdminPanel());
    });

    // Управление сотрудниками
    if (this.addEmployeeBtn) {
      this.addEmployeeBtn.addEventListener('click', () => {
        if (this.auth.canEdit()) {
          this.openEmployeeForm();
        } else {
          alert('У вас нет прав на редактирование');
        }
      });
    }

    if (this.employeeForm) {
      this.employeeForm.addEventListener('submit', (e) => this.saveEmployee(e));
    }

    this.formCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeEmployeeForm());
    });

    // Управление отделами
    if (this.addDepartmentBtn) {
      this.addDepartmentBtn.addEventListener('click', () => {
        if (this.auth.canEdit()) {
          this.addDepartment();
        } else {
          alert('У вас нет прав на редактирование');
        }
      });
    }

    // Экспорт/импорт
    if (this.exportDataBtn) this.exportDataBtn.addEventListener('click', () => this.exportData());
    if (this.importDataBtn) this.importDataBtn.addEventListener('click', () => this.importData());
    if (this.backupDataBtn) this.backupDataBtn.addEventListener('click', () => this.backupData());
    if (this.restoreDataBtn) this.restoreDataBtn.addEventListener('click', () => this.restoreData());
    if (this.clearAllDataBtn) this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    if (this.saveSettingsBtn) this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

    // SeaTable кнопки
    if (this.connectSeaTableBtn) {
      this.connectSeaTableBtn.addEventListener('click', () => {
        console.log('🔘 Кнопка "Подключиться к SeaTable" нажата');
        this.showSeaTableLogin();
      });
    }

    if (this.syncSeaTableBtn) {
      this.syncSeaTableBtn.addEventListener('click', () => {
        console.log('🔘 Кнопка "Синхронизировать" нажата');
        this.syncWithSeaTable();
      });
    }

    if (this.disconnectSeaTableBtn) {
      this.disconnectSeaTableBtn.addEventListener('click', () => {
        console.log('🔘 Кнопка "Отключить" нажата');
        this.disconnectSeaTable();
      });
    }

    // Управление пользователями
    if (this.addUserBtn) {
      this.addUserBtn.addEventListener('click', () => {
        if (this.auth.canManageUsers()) {
          this.openUserForm();
        } else {
          alert('У вас нет прав на управление пользователями');
        }
      });
    }

    if (this.changePasswordBtn) {
      this.changePasswordBtn.addEventListener('click', () => this.changePassword());
    }

    if (this.userForm) {
      this.userForm.addEventListener('submit', (e) => this.saveUser(e));
    }

    const userFormCloseBtns = document.querySelectorAll('.user-form-close, .user-form-cancel');
    userFormCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeUserForm());
    });

    // Переключение вкладок
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Закрытие модалок по клику вне
    window.addEventListener('click', (e) => {
      if (e.target === this.adminModal) this.closeAdminPanel();
      if (e.target === this.employeeFormModal) this.closeEmployeeForm();
      if (e.target === this.userFormModal) this.closeUserForm();
    });
  }

  // ========== ОСНОВНЫЕ МЕТОДЫ ==========

  async openAdminPanel() {
    if (!this.auth.getCurrentUser()) {
      if (window.loginModal) {
        window.loginModal.open();
      }
      return;
    }

    this.adminModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    await this.loadAdminTable();
    await this.loadDepartmentsList();
    await this.loadUsersList();
    await this.loadSettings();
    await this.loadHistory();
    await this.checkSeaTableConnection();
  }

  closeAdminPanel() {
    this.adminModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  updateUserInfo() {
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

  async logout() {
    await this.auth.logout();
    this.closeAdminPanel();
    if (window.app) {
      window.app.updateUIForUser();
    }
    alert('Вы вышли из системы');
  }

  // ========== УПРАВЛЕНИЕ СОТРУДНИКАМИ ==========

  async loadAdminTable() {
    const employees = await this.db.getAllEmployees();

    this.adminTableBody.innerHTML = employees.map(emp => `
            <tr>
                <td>${emp.id}</td>
                <td>${this.escapeHtml(emp.name)}</td>
                <td>${this.escapeHtml(emp.position)}</td>
                <td>${this.escapeHtml(emp.structuralUnit || emp.department || '')}</td>
                <td>${emp.phone}${emp.internalPhone ? ` (вн. ${emp.internalPhone})` : ''}</td>
                <td class="actions">
                    ${this.auth.canEdit() ? `
                        <button class="btn-edit" data-id="${emp.id}" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-id="${emp.id}" data-name="${emp.name}" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : '<span class="readonly-badge">Только чтение</span>'}
                </td>
            </tr>
        `).join('');

    if (this.auth.canEdit()) {
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => this.editEmployee(parseInt(btn.dataset.id)));
      });

      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => this.deleteEmployee(parseInt(btn.dataset.id), btn.dataset.name));
      });
    }
  }

  async loadDepartmentsList() {
    const departments = await this.db.getAllDepartments();

    this.departmentsList.innerHTML = departments.map(dept => `
            <div class="department-item">
                <span><i class="fas fa-building"></i> ${this.escapeHtml(dept)}</span>
                ${this.auth.canEdit() ? `
                    <button class="btn-delete-department" data-name="${dept}" title="Удалить отдел">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');

    if (this.auth.canEdit()) {
      document.querySelectorAll('.btn-delete-department').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm(`Удалить отдел "${btn.dataset.name}"?`)) {
            try {
              await this.db.deleteDepartment(btn.dataset.name);
              await this.loadDepartmentsList();
              await this.loadDepartmentsForForm();
              alert('Отдел удален');
            } catch (error) {
              alert(error.message);
            }
          }
        });
      });
    }
  }

  async loadDepartmentsForForm() {
    const departments = await this.db.getAllDepartments();
    const select = document.getElementById('empDepartment');
    if (select) {
      select.innerHTML = '<option value="">Выберите отдел</option>' +
        departments.map(dept => `<option value="${this.escapeHtml(dept)}">${this.escapeHtml(dept)}</option>`).join('');
    }
  }

  async openEmployeeForm(employee = null) {
    await this.loadDepartmentsForForm();

    this.employeeFormModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (employee) {
      this.formTitle.textContent = 'Редактировать сотрудника';
      document.getElementById('employeeId').value = employee.id;
      document.getElementById('empName').value = employee.name;
      document.getElementById('empPosition').value = employee.position;
      document.getElementById('empDepartment').value = employee.department || employee.structuralUnit || '';
      document.getElementById('empPhone').value = employee.phone;
      document.getElementById('empInternalPhone').value = employee.internalPhone || '';
      document.getElementById('empEmail').value = employee.email || '';
      document.getElementById('empLegalEntity').value = employee.legalEntity || '';
      document.getElementById('empStructuralUnit').value = employee.structuralUnit || '';
      document.getElementById('empSector').value = employee.sector || '';
      document.getElementById('empOffice').value = employee.office || '';
      document.getElementById('empWorkHours').value = employee.workHours || '';
      document.getElementById('empAdditional').value = employee.additional || '';
    } else {
      this.formTitle.textContent = 'Добавить сотрудника';
      this.employeeForm.reset();
      document.getElementById('employeeId').value = '';
    }
  }

  closeEmployeeForm() {
    this.employeeFormModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  async saveEmployee(e) {
    e.preventDefault();

    const employee = {
      name: document.getElementById('empName').value.trim(),
      position: document.getElementById('empPosition').value.trim(),
      department: document.getElementById('empDepartment').value,
      structuralUnit: document.getElementById('empStructuralUnit').value,
      sector: document.getElementById('empSector').value,
      phone: document.getElementById('empPhone').value.trim(),
      internalPhone: document.getElementById('empInternalPhone').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      legalEntity: document.getElementById('empLegalEntity').value,
      office: document.getElementById('empOffice').value.trim(),
      workHours: document.getElementById('empWorkHours').value.trim(),
      additional: document.getElementById('empAdditional').value.trim()
    };

    if (!employee.name || !employee.position || !employee.phone) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    const id = document.getElementById('employeeId').value;

    try {
      if (id) {
        employee.id = parseInt(id);
        await this.db.updateEmployee(employee);
        alert('Сотрудник обновлен');

        // Если есть SeaTable, обновляем и там
        if (window.seatableAPI && employee.seatableRowId) {
          await window.seatableAPI.updateRow(employee.seatableRowId, employee);
        }
      } else {
        const newId = await this.db.addEmployee(employee);
        alert('Сотрудник добавлен');

        // Если есть SeaTable, добавляем и туда
        if (window.seatableAPI) {
          await window.seatableAPI.addRow(employee);
        }
      }

      this.closeEmployeeForm();
      await this.loadAdminTable();

      if (window.app) {
        window.app.refreshData();
      }
    } catch (error) {
      alert('Ошибка при сохранении: ' + error.message);
    }
  }

  async editEmployee(id) {
    const employee = await this.db.getEmployeeById(id);
    if (employee) {
      this.openEmployeeForm(employee);
    }
  }

  async deleteEmployee(id, name) {
    if (confirm(`Удалить сотрудника "${name}"?`)) {
      const employee = await this.db.getEmployeeById(id);

      await this.db.deleteEmployee(id, name);

      // Если есть SeaTable, удаляем и там
      if (window.seatableAPI && employee?.seatableRowId) {
        await window.seatableAPI.deleteRow(employee.seatableRowId);
      }

      await this.loadAdminTable();

      if (window.app) {
        window.app.refreshData();
      }

      alert('Сотрудник удален');
    }
  }

  async addDepartment() {
    const departmentName = prompt('Введите название нового отдела:');
    if (departmentName && departmentName.trim()) {
      try {
        await this.db.addDepartment(departmentName.trim());
        await this.loadDepartmentsList();
        await this.loadDepartmentsForForm();
        alert('Отдел добавлен');
      } catch (error) {
        alert('Ошибка: отдел уже существует');
      }
    }
  }

  // ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

  async loadUsersList() {
    if (!this.auth.canManageUsers()) return;

    const users = await this.db.getAllUsers();
    const currentUser = this.auth.getCurrentUser();

    this.usersTableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.fullName || '')}</td>
                <td>${this.escapeHtml(user.email || '')}</td>
                <td>
                    <span class="role-badge role-${user.role}">
                        ${user.role === 'admin' ? 'Администратор' : user.role === 'editor' ? 'Редактор' : 'Наблюдатель'}
                    </span>
                </td>
                <td>${user.isActive ? '<span class="active-badge">Активен</span>' : '<span class="inactive-badge">Заблокирован</span>'}</td>
                <td class="actions">
                    <button class="btn-edit-user" data-id="${user.id}" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-reset-password" data-id="${user.id}" data-username="${user.username}" title="Сбросить пароль">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn-delete-user" data-id="${user.id}" data-username="${user.username}" 
                            title="Удалить" ${user.id === currentUser?.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    document.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => this.editUser(parseInt(btn.dataset.id)));
    });

    document.querySelectorAll('.btn-reset-password').forEach(btn => {
      btn.addEventListener('click', () => this.resetUserPassword(parseInt(btn.dataset.id), btn.dataset.username));
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', () => this.deleteUser(parseInt(btn.dataset.id), btn.dataset.username));
      }
    });
  }

  openUserForm(user = null) {
    if (!this.auth.canManageUsers()) return;

    this.userFormModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (user) {
      document.getElementById('userFormTitle').textContent = 'Редактировать пользователя';
      document.getElementById('userId').value = user.id;
      document.getElementById('userUsername').value = user.username;
      document.getElementById('userFullName').value = user.fullName || '';
      document.getElementById('userEmail').value = user.email || '';
      document.getElementById('userRole').value = user.role;
      document.getElementById('userActive').checked = user.isActive;
      document.getElementById('userPassword').required = false;
      document.getElementById('userPassword').placeholder = 'Оставьте пустым, чтобы не менять';
    } else {
      document.getElementById('userFormTitle').textContent = 'Добавить пользователя';
      this.userForm.reset();
      document.getElementById('userId').value = '';
      document.getElementById('userPassword').required = true;
    }
  }

  closeUserForm() {
    this.userFormModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  async saveUser(e) {
    e.preventDefault();

    const userData = {
      username: document.getElementById('userUsername').value.trim(),
      fullName: document.getElementById('userFullName').value.trim(),
      email: document.getElementById('userEmail').value.trim(),
      role: document.getElementById('userRole').value,
      isActive: document.getElementById('userActive').checked
    };

    if (!userData.username) {
      alert('Логин обязателен');
      return;
    }

    const userId = document.getElementById('userId').value;
    const password = document.getElementById('userPassword').value;

    try {
      if (userId) {
        const existingUser = await this.db.getUserById(parseInt(userId));
        if (password) {
          userData.password = await this.auth.hashPassword(password);
        } else {
          userData.password = existingUser.password;
        }
        userData.id = parseInt(userId);
        await this.db.updateUser(userData);
        alert('Пользователь обновлен');
      } else {
        if (!password || password.length < 4) {
          alert('Пароль должен быть не менее 4 символов');
          return;
        }
        userData.password = await this.auth.hashPassword(password);
        await this.db.addUser(userData);
        alert('Пользователь добавлен');
      }

      this.closeUserForm();
      await this.loadUsersList();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  }

  async editUser(id) {
    const user = await this.db.getUserById(id);
    if (user) {
      this.openUserForm(user);
    }
  }

  async resetUserPassword(userId, username) {
    const newPassword = prompt(`Введите новый пароль для пользователя ${username}:`);
    if (newPassword && newPassword.length >= 4) {
      const user = await this.db.getUserById(userId);
      user.password = await this.auth.hashPassword(newPassword);
      await this.db.updateUser(user);
      alert(`Пароль для пользователя ${username} изменен`);
    } else if (newPassword) {
      alert('Пароль должен быть не менее 4 символов');
    }
  }

  async deleteUser(id, username) {
    if (id === this.auth.currentUser?.id) {
      alert('Нельзя удалить самого себя');
      return;
    }

    if (confirm(`Удалить пользователя "${username}"?`)) {
      await this.db.deleteUser(id, username);
      await this.loadUsersList();
      alert('Пользователь удален');
    }
  }

  async changePassword() {
    const oldPassword = prompt('Введите текущий пароль:');
    if (!oldPassword) return;

    const newPassword = prompt('Введите новый пароль (минимум 4 символа):');
    if (!newPassword || newPassword.length < 4) {
      alert('Пароль должен быть не менее 4 символов');
      return;
    }

    const confirmPassword = prompt('Подтвердите новый пароль:');
    if (newPassword !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }

    const result = await this.auth.changePassword(
      this.auth.currentUser.id,
      oldPassword,
      newPassword
    );

    if (result.success) {
      alert('Пароль успешно изменен');
    } else {
      alert(result.message);
    }
  }

  // ========== НАСТРОЙКИ ==========

  async loadSettings() {
    const requireAuth = await this.db.getSetting('requireAuth', false);
    const orgName = await this.db.getSetting('orgName', 'Администрация города');

    if (this.requireAuth) this.requireAuth.checked = requireAuth;
    if (this.orgName) this.orgName.value = orgName;

    const headerTitle = document.querySelector('.logo-section h1');
    if (headerTitle) headerTitle.textContent = orgName;
  }

  async saveSettings() {
    if (this.requireAuth) await this.db.setSetting('requireAuth', this.requireAuth.checked);
    if (this.orgName) await this.db.setSetting('orgName', this.orgName.value);

    const headerTitle = document.querySelector('.logo-section h1');
    if (headerTitle) headerTitle.textContent = this.orgName.value;

    alert('Настройки сохранены');
  }

  async loadHistory() {
    const history = await this.db.getHistory(100);
    const historyList = document.getElementById('historyList');
    if (historyList) {
      historyList.innerHTML = history.map(item => `
                <div class="history-item">
                    <div class="history-date">${new Date(item.date).toLocaleString('ru-RU')}</div>
                    <div class="history-action">
                        <span class="action-badge action-${item.action.replace(/_/g, '-')}">${item.action}</span>
                        ${this.escapeHtml(item.description)}
                    </div>
                </div>
            `).join('');
    }
  }

  // ========== ЭКСПОРТ/ИМПОРТ ==========

  async exportData() {
    const data = await this.db.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone_directory_backup_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Данные экспортированы');
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();

      if (confirm('Импорт данных заменит все существующие данные. Продолжить?')) {
        try {
          await this.db.importData(text);
          await this.loadAdminTable();
          await this.loadDepartmentsList();
          await this.loadDepartmentsForForm();
          await this.loadUsersList();

          if (window.app) {
            window.app.refreshData();
          }

          alert('Данные успешно импортированы');
        } catch (error) {
          alert('Ошибка импорта: ' + error.message);
        }
      }
    };

    input.click();
  }

  async backupData() {
    await this.exportData();
  }

  async restoreData() {
    await this.importData();
  }

  async clearAllData() {
    if (confirm('ВНИМАНИЕ! Это действие удалит ВСЕ данные. Продолжить?')) {
      await this.db.clearAllData();
      await this.db.initDemoData();
      await this.loadAdminTable();
      await this.loadDepartmentsList();
      await this.loadDepartmentsForForm();
      await this.loadUsersList();

      if (window.app) {
        window.app.refreshData();
      }

      alert('Все данные очищены');
    }
  }

  // ========== SEATABLE ИНТЕГРАЦИЯ ==========

  async checkSeaTableConnection() {
    const connected = await this.db.getSetting('seatable_connected', false);
    const baseId = await this.db.getSetting('seatable_base_id', '');
    const tableName = await this.db.getSetting('seatable_table_name', '');
    const userEmail = await this.db.getSetting('seatable_user_email', '');

    if (connected && baseId) {
      this.updateSeaTableUI(true, baseId, tableName, userEmail);
    } else {
      this.updateSeaTableUI(false);
    }
  }

  updateSeaTableUI(connected, baseName = '', tableName = '', userEmail = '') {
    const connectBtn = document.getElementById('connectSeaTableBtn');
    const syncBtn = document.getElementById('syncSeaTableBtn');
    const disconnectBtn = document.getElementById('disconnectSeaTableBtn');
    const statusDiv = document.getElementById('seatableConnectionStatus');

    if (connected) {
      if (connectBtn) connectBtn.style.display = 'none';
      if (syncBtn) syncBtn.style.display = 'inline-block';
      if (disconnectBtn) disconnectBtn.style.display = 'inline-block';

      if (statusDiv) {
        statusDiv.className = 'connection-status connected';
        statusDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <strong>✅ Подключено к SeaTable</strong><br>
                        <small>База: ${this.escapeHtml(baseName)} / Таблица: ${this.escapeHtml(tableName)}</small><br>
                        <small>Пользователь: ${this.escapeHtml(userEmail)}</small>
                    </div>
                `;
      }
    } else {
      if (connectBtn) connectBtn.style.display = 'inline-block';
      if (syncBtn) syncBtn.style.display = 'none';
      if (disconnectBtn) disconnectBtn.style.display = 'none';

      if (statusDiv) {
        statusDiv.className = 'connection-status disconnected';
        statusDiv.innerHTML = `
                    <i class="fas fa-plug"></i>
                    <div>
                        <strong>⚠️ Не подключено к SeaTable</strong><br>
                        <small>Для синхронизации справочника нажмите "Подключиться"</small>
                    </div>
                `;
      }
    }
  }

  showSeaTableLogin() {
    console.log('📱 Открываем форму входа в SeaTable');

    let modal = document.getElementById('seatableLoginModal');

    if (!modal) {
      this.createSeaTableLoginModal();
      modal = document.getElementById('seatableLoginModal');
    }

    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';

      const errorDiv = document.getElementById('seatableLoginError');
      if (errorDiv) errorDiv.style.display = 'none';

      const emailInput = document.getElementById('seatableEmail');
      const passwordInput = document.getElementById('seatablePassword');
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';

      setTimeout(() => {
        if (emailInput) emailInput.focus();
      }, 100);
    } else {
      console.error('Не удалось создать модальное окно');
      alert('Ошибка: не удалось открыть форму входа');
    }
  }

  createSeaTableLoginModal() {
    const serverValue = this.seatableServerInput ? this.seatableServerInput.value : 'https://ditable.yanao.ru';

    const modalHTML = `
            <div id="seatableLoginModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-table"></i> Вход в SeaTable</h2>
                        <button class="modal-close seatable-login-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="seatableLoginForm">
                            <div class="form-group">
                                <label><i class="fas fa-envelope"></i> Email / Логин</label>
                                <input type="email" id="seatableEmail" required 
                                       placeholder="user@yanao.ru" autocomplete="username">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-lock"></i> Пароль</label>
                                <input type="password" id="seatablePassword" required 
                                       placeholder="••••••••" autocomplete="current-password">
                            </div>
                            <div id="seatableLoginError" class="error-message" style="display: none;"></div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-sign-in-alt"></i> Войти
                                </button>
                                <button type="button" id="cancelSeatableLogin" class="btn-secondary">
                                    <i class="fas fa-times"></i> Отмена
                                </button>
                            </div>
                        </form>
                        <div class="info-box" style="margin-top: 20px;">
                            <i class="fas fa-info-circle"></i>
                            <strong>Информация:</strong>
                            <p style="margin-top: 10px;">Для синхронизации справочника с SeaTable необходимо авторизоваться с учетными данными, которые используются для входа в SeaTable.</p>
                            <p>Сервер: <strong>${this.escapeHtml(serverValue)}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindSeaTableLoginEvents();
  }

  bindSeaTableLoginEvents() {
    const modal = document.getElementById('seatableLoginModal');
    const form = document.getElementById('seatableLoginForm');
    const closeBtn = document.querySelector('.seatable-login-close');
    const cancelBtn = document.getElementById('cancelSeatableLogin');

    if (!form) return;

    const handleSubmit = async (e) => {
      e.preventDefault();
      await this.handleSeaTableLogin();
    };

    const handleClose = () => {
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    };

    form.addEventListener('submit', handleSubmit);
    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (cancelBtn) cancelBtn.addEventListener('click', handleClose);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleClose();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.style.display === 'block') {
        handleClose();
      }
    });
  }

  async handleSeaTableLogin() {
    const email = document.getElementById('seatableEmail')?.value;
    const password = document.getElementById('seatablePassword')?.value;
    const errorDiv = document.getElementById('seatableLoginError');
    const submitBtn = document.querySelector('#seatableLoginForm button[type="submit"]');

    if (!email || !password) {
      if (errorDiv) {
        errorDiv.textContent = 'Заполните email и пароль';
        errorDiv.style.display = 'block';
      }
      return;
    }

    if (errorDiv) errorDiv.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Вход...';
    }

    try {
      const serverUrl = this.seatableServerInput ? this.seatableServerInput.value : 'https://ditable.yanao.ru';

      console.log(`🔐 Пытаемся войти в SeaTable: ${serverUrl}`);

      // Создаем экземпляр авторизации
      const seatableAuth = new SeaTableAuth(serverUrl);
      const result = await seatableAuth.login(email, password);

      if (result.success) {
        console.log('✅ Успешный вход в SeaTable');

        await this.db.setSetting('seatable_user_email', email);
        await this.db.setSetting('seatable_user_name', result.user?.name || email);
        await this.db.setSetting('seatable_server', serverUrl);
        await this.db.setSetting('seatable_token', result.token);

        window.seatableAuth = seatableAuth;
        window.seatableAPI = new SeaTableAPI(serverUrl, seatableAuth);

        const bases = await window.seatableAPI.getBases();
        console.log('📚 Доступные базы:', bases);

        let targetBase = bases.find(b =>
          b.name === 'phones' ||
          b.name.toLowerCase().includes('phone')
        );

        if (!targetBase && bases.length > 0) {
          targetBase = bases[0];
          console.log(`⚠️ База "phones" не найдена, использую: ${targetBase.name}`);
        }

        if (targetBase) {
          await window.seatableAPI.selectBase(targetBase.id);

          const tables = await window.seatableAPI.getTables();
          console.log('📊 Таблицы:', tables);

          let targetTable = tables.find(t =>
            t.name === 'phones' ||
            t.name.toLowerCase().includes('phone') ||
            t.name === 'Сотрудники'
          );

          if (!targetTable && tables.length > 0) {
            targetTable = tables[0];
          }

          if (targetTable) {
            await window.seatableAPI.selectTable(targetTable.name);

            await this.db.setSetting('seatable_base_id', targetBase.id);
            await this.db.setSetting('seatable_table_name', targetTable.name);
            await this.db.setSetting('seatable_connected', true);

            this.updateSeaTableUI(true, targetBase.name, targetTable.name, email);

            const modal = document.getElementById('seatableLoginModal');
            if (modal) {
              modal.style.display = 'none';
              document.body.style.overflow = '';
            }

            alert(`✅ Успешное подключение к SeaTable!\n\nБаза: ${targetBase.name}\nТаблица: ${targetTable.name}\nПользователь: ${email}`);

            await this.syncWithSeaTable();
          } else {
            throw new Error('Таблица не найдена');
          }
        } else {
          throw new Error('База данных не найдена');
        }
      } else {
        if (errorDiv) {
          errorDiv.textContent = result.error || 'Ошибка авторизации. Проверьте email и пароль.';
          errorDiv.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
      if (errorDiv) {
        errorDiv.textContent = error.message || 'Ошибка подключения к SeaTable';
        errorDiv.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
      }
    }
  }

  async syncWithSeaTable() {
    if (!window.seatableAPI) {
      alert('Сначала подключитесь к SeaTable');
      return;
    }

    const syncBtn = document.getElementById('syncSeaTableBtn');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Синхронизация...';
    }

    try {
      console.log('🔄 Начинаем синхронизацию с SeaTable...');
      this.showSyncStatus('Синхронизация с SeaTable...');

      const rows = await window.seatableAPI.getAllRows();
      console.log(`📥 Получено ${rows.length} записей из SeaTable`);

      let added = 0;
      let updated = 0;

      for (const row of rows) {
        const existing = (await this.db.getAllEmployees()).find(e => e.seatableRowId === row.seatableRowId);

        if (existing) {
          await this.db.updateEmployee(row);
          updated++;
        } else {
          await this.db.addEmployee(row);
          added++;
        }
      }

      if (window.app) {
        await window.app.refreshData();
      }

      await this.loadAdminTable();

      const message = `✅ Синхронизация завершена: +${added} добавлено, ~${updated} обновлено`;
      console.log(message);
      this.showSyncStatus(message, true);

    } catch (error) {
      console.error('❌ Ошибка синхронизации:', error);
      this.showSyncStatus(`❌ Ошибка: ${error.message}`, false);
    } finally {
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<i class="fas fa-sync"></i> Синхронизировать сейчас';
      }
    }
  }

  async disconnectSeaTable() {
    if (confirm('Отключиться от SeaTable? Локальные данные сохранятся, но синхронизация остановится.')) {
      await this.db.setSetting('seatable_connected', false);
      await this.db.setSetting('seatable_token', null);

      if (window.seatableAuth) {
        window.seatableAuth.logout();
      }

      window.seatableAPI = null;
      window.seatableAuth = null;

      this.updateSeaTableUI(false);
      this.showSyncStatus('Отключено от SeaTable', true);
    }
  }

  showSyncStatus(message, isSuccess = true) {
    let statusDiv = document.getElementById('seatableSyncStatus');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'seatableSyncStatus';
      statusDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
      document.body.appendChild(statusDiv);
    }

    statusDiv.innerHTML = `
            <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            ${message}
        `;
    statusDiv.style.background = isSuccess ? '#d4edda' : '#f8d7da';
    statusDiv.style.color = isSuccess ? '#155724' : '#721c24';

    setTimeout(() => {
      statusDiv.style.opacity = '0';
      setTimeout(() => {
        if (statusDiv.parentNode) statusDiv.remove();
      }, 500);
    }, 4000);
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  switchTab(tabName) {
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });

    if (tabName === 'users') this.loadUsersList();
    if (tabName === 'history') this.loadHistory();
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}