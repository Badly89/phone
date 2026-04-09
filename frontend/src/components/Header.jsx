import React from 'react';

const Header = ({ totalCount, lastUpdate }) => {
    return (
        <>
            <header className="header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo-icon">
                            <i className="fas fa-city"></i>
                        </div>
                        <div>
                            <h1>Администрация города</h1>
                            <p>Телефонный справочник</p>
                        </div>
                    </div>
                    <div className="header-stats">
                        <i className="fas fa-users"></i>
                        <span>{totalCount}</span> сотрудников
                    </div>
                </div>
            </header>
            
        </>
    );
};

export default Header;