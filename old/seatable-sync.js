/**
 * Класс для синхронизации с SeaTable
 */
class SeaTableSync {
  constructor(seatableAPI, localDB) {
    this.seatable = seatableAPI;
    this.localDB = localDB;
    this.syncInterval = null;
    this.lastSyncTime = null;
  }

  /**
   * Запуск синхронизации
   */
  startSync(intervalMinutes = 5) {
    console.log(`Запуск синхронизации с SeaTable (интервал: ${intervalMinutes} мин)`);

    // Первоначальная синхронизация
    this.syncFromSeaTable();

    // Периодическая синхронизация
    this.syncInterval = setInterval(() => {
      this.syncFromSeaTable();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Остановка синхронизации
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Синхронизация остановлена');
    }
  }

  /**
   * Синхронизация данных из SeaTable в локальную базу
   */
  async syncFromSeaTable() {
    try {
      console.log('Начинаем синхронизацию с SeaTable...');
      this.showSyncStatus('Синхронизация...');

      // Получаем данные из SeaTable
      const seaEmployees = await this.seatable.getAllEmployees();

      // Получаем локальные данные
      const localEmployees = await this.localDB.getAllEmployees();

      // Синхронизируем
      let added = 0;
      let updated = 0;
      let deleted = 0;

      // Обновляем или добавляем сотрудников
      for (const seaEmp of seaEmployees) {
        const localEmp = localEmployees.find(emp => emp.seatableRowId === seaEmp.seatableRowId);

        if (!localEmp) {
          // Добавляем нового сотрудника
          await this.localDB.addEmployee(seaEmp);
          added++;
        } else if (this.isEmployeeChanged(localEmp, seaEmp)) {
          // Обновляем существующего
          await this.localDB.updateEmployee(seaEmp);
          updated++;
        }
      }

      // Удаляем сотрудников, которых нет в SeaTable
      for (const localEmp of localEmployees) {
        if (localEmp.seatableRowId) {
          const existsInSea = seaEmployees.some(seaEmp => seaEmp.seatableRowId === localEmp.seatableRowId);
          if (!existsInSea) {
            await this.localDB.deleteEmployee(localEmp.id, localEmp.name);
            deleted++;
          }
        }
      }

      this.lastSyncTime = new Date();
      console.log(`Синхронизация завершена: +${added} / ~${updated} / -${deleted}`);
      this.showSyncStatus(`Синхронизация завершена (${new Date().toLocaleTimeString()})`, true);

      // Обновляем UI
      if (window.app) {
        await window.app.refreshData();
      }

      return { added, updated, deleted, time: this.lastSyncTime };
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      this.showSyncStatus('Ошибка синхронизации!', false);
      throw error;
    }
  }

  /**
   * Проверка изменений сотрудника
   */
  isEmployeeChanged(local, remote) {
    return local.updatedAt !== remote.updatedAt ||
      local.name !== remote.name ||
      local.position !== remote.position ||
      local.phone !== remote.phone ||
      local.internalPhone !== remote.internalPhone ||
      local.email !== remote.email ||
      local.legalEntity !== remote.legalEntity ||
      local.structuralUnit !== remote.structuralUnit ||
      local.sector !== remote.sector ||
      local.office !== remote.office ||
      local.workHours !== remote.workHours ||
      local.additional !== remote.additional;
  }

  /**
   * Отображение статуса синхронизации
   */
  showSyncStatus(message, isSuccess = false) {
    let statusDiv = document.getElementById('syncStatus');

    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'syncStatus';
      statusDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                font-size: 12px;
                transition: all 0.3s ease;
            `;
      document.body.appendChild(statusDiv);
    }

    statusDiv.innerHTML = `
            <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-sync-alt'}"></i>
            ${message}
        `;
    statusDiv.style.background = isSuccess ? '#d4edda' : '#fff3cd';
    statusDiv.style.color = isSuccess ? '#155724' : '#856404';

    setTimeout(() => {
      statusDiv.style.opacity = '0';
      setTimeout(() => {
        if (statusDiv.parentNode) statusDiv.remove();
      }, 1000);
    }, 3000);
  }

  /**
   * Ручная синхронизация
   */
  async manualSync() {
    const btn = document.getElementById('manualSyncBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Синхронизация...';
    }

    try {
      await this.syncFromSeaTable();
      alert('Синхронизация успешно завершена!');
    } catch (error) {
      alert('Ошибка синхронизации: ' + error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync"></i> Синхронизировать';
      }
    }
  }

  /**
   * Получение последнего времени синхронизации
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
}