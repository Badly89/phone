import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SearchFilters from './components/SearchFilters';
import EmployeeCard from './components/EmployeeCard';
import EmployeeModal from './components/EmployeeModal';
import seatableService from './services/seatableService';
import './styles/App.css';

function App() {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [filters, setFilters] = useState({ 
        managements: [], 
        structuralUnits: [], 
        legalEntities: [] 
    });
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManagement, setSelectedManagement] = useState('all');
    const [selectedStructuralUnit, setSelectedStructuralUnit] = useState('all');
    const [selectedLegalEntity, setSelectedLegalEntity] = useState('all');
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Загружаем сотрудников
            const employeesData = await seatableService.fetchEmployees();
            setEmployees(employeesData);
            setFilteredEmployees(employeesData);
            
            // Загружаем фильтры
            const filtersData = await seatableService.getFilters();
            setFilters(filtersData);
            
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Load error:', err);
            setError(err.message || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    }, []);

    const syncData = useCallback(async () => {
        setSyncing(true);
        await loadData();
        setSyncing(false);
    }, [loadData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Фильтрация сотрудников
    useEffect(() => {
        const filtered = employees.filter(emp => {
            const matchesSearch = !searchTerm || 
                emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.phone?.includes(searchTerm) ||
                emp.management?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.structuralUnit?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesManagement = selectedManagement === 'all' || emp.management === selectedManagement;
            const matchesStructuralUnit = selectedStructuralUnit === 'all' || emp.structuralUnit === selectedStructuralUnit;
            const matchesLegalEntity = selectedLegalEntity === 'all' || emp.legalEntity === selectedLegalEntity;
            
            return matchesSearch && matchesManagement && matchesStructuralUnit && matchesLegalEntity;
        });
        
        setFilteredEmployees(filtered);
    }, [employees, searchTerm, selectedManagement, selectedStructuralUnit, selectedLegalEntity]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedManagement('all');
        setSelectedStructuralUnit('all');
        setSelectedLegalEntity('all');
    };

    if (error) {
        return (
            <div className="app-container">
                <div className="error-container">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h2>Ошибка загрузки данных</h2>
                    <p>{error}</p>
                    <button onClick={syncData} className="btn-refresh">
                        <i className="fas fa-sync-alt"></i> Повторить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header 
                totalCount={filteredEmployees.length} 
                lastUpdate={lastUpdate}
                onRefresh={syncData}
                syncing={syncing}
            />
            
            <SearchFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedManagement={selectedManagement}
                setSelectedManagement={setSelectedManagement}
                selectedStructuralUnit={selectedStructuralUnit}
                setSelectedStructuralUnit={setSelectedStructuralUnit}
                selectedLegalEntity={selectedLegalEntity}
                setSelectedLegalEntity={setSelectedLegalEntity}
                filters={filters}
                onReset={resetFilters}
                onRefresh={syncData}
                loading={loading || syncing}
            />
            
            <div className="employees-grid">
                {loading ? (
                    <div className="loading-spinner">
                        <i className="fas fa-spinner fa-pulse"></i>
                        <h3>Загрузка данных...</h3>
                        <p>Пожалуйста, подождите</p>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="no-results">
                        <i className="fas fa-phone-slash"></i>
                        <h3>Ничего не найдено</h3>
                        <p>Попробуйте изменить параметры поиска или сбросить фильтры</p>
                        <button onClick={resetFilters} className="btn-reset" style={{ marginTop: '20px' }}>
                            <i className="fas fa-undo-alt"></i> Сбросить фильтры
                        </button>
                    </div>
                ) : (
                    filteredEmployees.map(emp => (
                        <EmployeeCard 
                            key={emp.id} 
                            employee={emp} 
                            onClick={() => setSelectedEmployee(emp)}
                        />
                    ))
                )}
            </div>
            
            {selectedEmployee && (
                <EmployeeModal 
                    employee={selectedEmployee} 
                    onClose={() => setSelectedEmployee(null)} 
                />
            )}
        </div>
    );
}

export default App;