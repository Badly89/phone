import React, { useEffect } from 'react';

const EmployeeModal = ({ employee, onClose }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <i className="fas fa-address-card"></i>
                        Контактная информация
                    </h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                
                <div className="modal-body">
                    <div className="contact-profile">
                        <div className="contact-avatar">
                            <i className="fas fa-user-circle"></i>
                        </div>
                        <h3 className="contact-name">{employee.name || ''}</h3>
                        <p className="contact-position">{employee.position || ''}</p>
                    </div>
                    
                    {(employee.management || employee.structuralUnit || employee.legalEntity) && (
                        <div className="contact-section">
                            <div className="contact-section-title">
                                <i className="fas fa-building"></i> Структура
                            </div>
                            {employee.management && (
                                <div className="contact-info-item">
                                    <div className="contact-info-icon"><i className="fas fa-building"></i></div>
                                    <div>
                                        <div className="contact-info-label">Управление</div>
                                        <div className="contact-info-value">{employee.management}</div>
                                    </div>
                                </div>
                            )}
                            {employee.structuralUnit && (
                                <div className="contact-info-item">
                                    <div className="contact-info-icon"><i className="fas fa-sitemap"></i></div>
                                    <div>
                                        <div className="contact-info-label">Структурное подразделение</div>
                                        <div className="contact-info-value">{employee.structuralUnit}</div>
                                    </div>
                                </div>
                            )}
                            {employee.legalEntity && (
                                <div className="contact-info-item">
                                    <div className="contact-info-icon"><i className="fas fa-balance-scale"></i></div>
                                    <div>
                                        <div className="contact-info-label">Юридическое лицо</div>
                                        <div className="contact-info-value">{employee.legalEntity}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {(employee.phone || employee.internalPhone) && (
                        <div className="contact-section">
                            <div className="contact-section-title">
                                <i className="fas fa-phone-alt"></i> Контакты
                            </div>
                            {employee.phone && (
                                <div className="contact-info-item">
                                    <div className="contact-info-icon"><i className="fas fa-phone"></i></div>
                                    <div>
                                        <div className="contact-info-label">Телефон</div>
                                        <div className="contact-info-value">
                                            <a href={`tel:${employee.phone}`}>{employee.phone}</a>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {employee.internalPhone && (
                                <div className="contact-info-item">
                                    <div className="contact-info-icon"><i className="fas fa-phone-alt"></i></div>
                                    <div>
                                        <div className="contact-info-label">Внутренний номер</div>
                                        <div className="contact-info-value">{employee.internalPhone}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {employee.office && (
                        <div className="contact-section">
                            <div className="contact-section-title">
                                <i className="fas fa-location-dot"></i> Расположение
                            </div>
                            <div className="contact-info-item">
                                <div className="contact-info-icon"><i className="fas fa-door-open"></i></div>
                                <div>
                                    <div className="contact-info-label">Кабинет</div>
                                    <div className="contact-info-value">{employee.office}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="contact-actions">
                        {employee.phone && (
                            <a href={`tel:${employee.phone}`} className="contact-action-btn call">
                                <i className="fas fa-phone"></i> Позвонить
                            </a>
                        )}
                        <button className="contact-action-btn close" onClick={onClose}>
                            <i className="fas fa-times"></i> Закрыть
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeModal;