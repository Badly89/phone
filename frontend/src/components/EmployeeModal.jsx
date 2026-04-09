import React, { useEffect, useState } from 'react';

const EmployeeModal = ({ employee, onClose }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        // Запускаем анимацию появления
        setTimeout(() => setIsAnimating(true), 10);
        
        // Закрытие по Escape
        const handleEsc = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEsc);
        
        // Блокировка прокрутки фона
        document.body.style.overflow = 'hidden';
        
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, []);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setShouldRender(false);
            onClose();
        }, 500); // Ждём окончания анимации вращения
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!shouldRender) return null;

    return (
        <div 
            className={`modal-overlay ${isAnimating ? 'active' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className={`modal-container ${isAnimating ? 'active' : ''}`}>
                <div className="modal-card">
                    <div className="modal-header">
                        <div className="modal-avatar">
                            <i className="fas fa-user-circle"></i>
                        </div>
                        <button className="modal-close" onClick={handleClose}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="modal-body">
                        <h2 className="modal-name">{employee.name || ''}</h2>
                        <p className="modal-position">{employee.position || ''}</p>
                        
                        <div className="modal-section">
                            <h4><i className="fas fa-building"></i> Структура подразделения</h4>
                            {employee.management && (
                                <div className="modal-info-item">
                                    <span className="info-label">Управление:</span>
                                    <span className="info-value">{employee.management}</span>
                                </div>
                            )}
                            {employee.structuralUnit && (
                                <div className="modal-info-item">
                                    <span className="info-label">Структурное подразделение:</span>
                                    <span className="info-value">{employee.structuralUnit}</span>
                                </div>
                            )}
                            {employee.legalEntity && (
                                <div className="modal-info-item">
                                    <span className="info-label">Юридическое лицо:</span>
                                    <span className="info-value">{employee.legalEntity}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-section">
                            <h4><i className="fas fa-phone-alt"></i> Контактная информация</h4>
                            {employee.phone && (
                                <div className="modal-info-item">
                                    <span className="info-label">Телефон:</span>
                                    <a href={`tel:${employee.phone}`} className="info-value phone-link">
                                        {employee.phone}
                                    </a>
                                </div>
                            )}
                            {employee.internalPhone && (
                                <div className="modal-info-item">
                                    <span className="info-label">Внутренний номер:</span>
                                    <span className="info-value">{employee.internalPhone}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-section">
                            <h4><i className="fas fa-location-dot"></i> Расположение</h4>
                            {employee.office && (
                                <div className="modal-info-item">
                                    <span className="info-label">Кабинет:</span>
                                    <span className="info-value">{employee.office}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-actions">
                            {employee.phone && (
                                <a href={`tel:${employee.phone}`} className="action-btn call">
                                    <i className="fas fa-phone"></i> Позвонить
                                </a>
                            )}
                            <button onClick={handleClose} className="action-btn close">
                                <i className="fas fa-times"></i> Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeModal;