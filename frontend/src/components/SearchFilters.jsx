import React from 'react';

const SearchFilters = ({
    searchTerm,
    setSearchTerm,
    selectedManagement,
    setSelectedManagement,
    selectedStructuralUnit,
    setSelectedStructuralUnit,
    selectedLegalEntity,
    setSelectedLegalEntity,
    filters,
    onReset,
    onRefresh,
    loading
}) => {
    return (
        <div className="search-section">
            <div className="search-box">
                <i className="fas fa-search search-icon"></i>
                <input
                    type="text"
                    placeholder="Поиск по имени, должности, отделу или телефону..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button className="clear-btn" onClick={() => setSearchTerm('')}>
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>
            
            <div className="filters">
                <div className="filter-group">
                    <label><i className="fas fa-building"></i> Управление</label>
                    <select 
                        value={selectedManagement} 
                        onChange={(e) => setSelectedManagement(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Все управления</option>
                        {filters.managements.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                
                <div className="filter-group">
                    <label><i className="fas fa-sitemap"></i> Подразделение</label>
                    <select 
                        value={selectedStructuralUnit} 
                        onChange={(e) => setSelectedStructuralUnit(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Все подразделения</option>
                        {filters.structuralUnits.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                
                <div className="filter-group">
                    <label><i className="fas fa-balance-scale"></i> Юридическое лицо</label>
                    <select 
                        value={selectedLegalEntity} 
                        onChange={(e) => setSelectedLegalEntity(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Все юрлица</option>
                        {filters.legalEntities.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
                
                <button className="btn-reset" onClick={onReset}>
                    <i className="fas fa-undo-alt"></i> Сбросить
                </button>
                
                <button className="btn-refresh" onClick={onRefresh} disabled={loading}>
                    <i className="fas fa-sync-alt"></i> Обновить
                </button>
            </div>
        </div>
    );
};

export default SearchFilters;