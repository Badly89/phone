import React from 'react';

const EmployeeCard = ({ employee, onClick }) => {
    return (
        <div className="employee-card" onClick={onClick}>
            <div className="card-header">
                <div className="card-avatar">
                    <i className="fas fa-user-circle"></i>
                </div>
                <div className="card-title">
                    <h3>{employee.name || 'Без имени'}</h3>
                    <p>{employee.position || 'Должность не указана'}</p>
                </div>
            </div>
            
            <div className="card-details">
                {/* {(employee.management || employee.structuralUnit) && (
                    <div className="detail-row">
                        <i className="fas fa-building"></i>
                        <span>
                            <strong>Отдел:</strong> {employee.structuralUnit || employee.management}
                        </span>
                    </div>
                )} */}
                
                {/* {employee.legalEntity && (
                    <div className="detail-row">
                        <i className="fas fa-balance-scale"></i>
                        <span><strong>Юрлицо:</strong> {employee.legalEntity}</span>
                    </div>
                )} */}
                
                {/* {employee.phone && (
                    <div className="detail-row">
                        <i className="fas fa-phone"></i>
                        <span><strong>Телефон:</strong> {employee.phone}</span>
                    </div>
                )}
                
                {employee.internalPhone && (
                    <div className="detail-row">
                        <i className="fas fa-phone-alt"></i>
                        <span><strong>Внутренний:</strong> {employee.internalPhone}</span>
                    </div>
                )} */}
                
                {employee.office && (
                    <div className="detail-row">
                        <i className="fas fa-door-open"></i>
                        <span><strong>Кабинет:</strong> {employee.office}</span>
                    </div>
                )}
            </div>
            
            <div className="card-badges">
                {employee.management && <span className="badge badge-management">{employee.management}</span>}
                {employee.structuralUnit && <span className="badge badge-structural">{employee.structuralUnit}</span>}
                {employee.legalEntity && <span className="badge badge-legal">{employee.legalEntity}</span>}
            </div>
            
            <div className="click-hint">
                <i className="fas fa-hand-pointer"></i> Нажмите для подробностей
            </div>
        </div>
    );
};

export default EmployeeCard;