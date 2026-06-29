import React, { useState } from 'react';
import { useLogs } from '../../hooks/useLogs.js';
import Layout from '../../components/Layout/Layout.jsx';
import '/home/arthur/Proyectos/formulario/frontend/src/styles/admin-global.css';

const Logs = () => {
    const {
        datos,
        loading,
        error,
        buscar,
        user,
        handleBuscar,
        handleLogout,
        descargarExcel
    } = useLogs();

    const [selectedRow, setSelectedRow] = useState(null);
    const columnas = datos.length > 0 ? Object.keys(datos[0]) : [];

    const formatearColumna = (col) => {
        return col.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    };

    const formatearValor = (valor) => {
        if (valor === null || valor === undefined || valor === '') {
            return <span className="empty-cell">—</span>;
        }
        if (typeof valor === 'string' && valor.length > 100) {
            return valor.substring(0, 100) + '...';
        }
        return valor;
    };

    return (
        <Layout user={user} activeSection="logs" onLogout={handleLogout}>
            <h1 className="page-title">Contenido: Logs del Sistema</h1>

            {/* Filters */}
            <form className="filters" onSubmit={(e) => e.preventDefault()}>
                <input type="hidden" name="tabla" value="auditoria_sistema" />
                <div className="filter-group">
                    <label className="filter-label">Buscar</label>
                    <div className="filter-search-icon">
                        <i className="fas fa-search"></i>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Cédula o Nombre"
                            value={buscar}
                            onChange={handleBuscar}
                        />
                    </div>
                </div>
            </form>

            {/* Loading */}
            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Cargando datos...</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="alert alert-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                </div>
            )}

            {/* Table */}
            {!loading && !error && datos.length > 0 && (
                <div className="table-container">
                    <table id="dataTable">
                        <thead>
                            <tr>
                                {columnas.map(columna => (
                                    <th key={columna}>{formatearColumna(columna)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {datos.map((fila, idx) => (
                                <tr 
                                    key={idx}
                                    className={selectedRow === idx ? 'selected' : ''}
                                    onClick={() => setSelectedRow(idx)}
                                >
                                    {columnas.map(columna => (
                                        <td key={`${idx}-${columna}`}>
                                            {formatearValor(fila[columna])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && datos.length === 0 && (
                <div className="table-container">
                    <div className="vacio">
                        <i className="fas fa-inbox"></i>
                        No hay datos en esta tabla.
                    </div>
                </div>
            )}

            {/* Footer con descargas */}
            <footer className="logs-footer">
                <div className="footer-left">
                    <span className="footer-label">Descargar Excel</span>
                    <button 
                        className="footer-btn footer-btn-green"
                        onClick={() => descargarExcel('estudiantes')}
                    >
                        <i className="fas fa-download"></i>
                        Estudiantes
                    </button>
                    <button 
                        className="footer-btn footer-btn-blue"
                        onClick={() => descargarExcel('personal_universidad')}
                    >
                        <i className="fas fa-download"></i>
                        Funcionarios
                    </button>
                    <button 
                        className="footer-btn footer-purple"
                        onClick={() => descargarExcel('registros')}
                    >
                        <i className="fas fa-download"></i>
                        Registros
                    </button>
                </div>
                <div className="footer-right">
                    <i className="fas fa-shield-alt"></i>
                    <span>Sistema seguro</span>
                    <span>•</span>
                    <span className="version">v1.0.0</span>
                </div>
            </footer>
        </Layout>
    );
};

export default Logs;