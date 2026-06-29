import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import api from '../../api/axiosConfig';  // ← NUEVO
import Layout from '../../components/Layout/Layout.jsx';
import './BasesDatos.css';

const BasesDatos = () => {
    const { user, handleLogout } = usePanel();

    // ---------- Estados ----------
    const [tabla, setTabla] = useState('');
    const [cede, setCede] = useState('');
    const [buscar, setBuscar] = useState('');
    const [datos, setDatos] = useState([]);
    const [columnas, setColumnas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filaSeleccionada, setFilaSeleccionada] = useState(null);
    const [error, setError] = useState(null);

    const buscarInputRef = useRef(null);

    // ---------- Cargar datos desde la API ----------
    const cargarDatos = useCallback(async () => {
        if (!tabla) {
            setDatos([]);
            setColumnas([]);
            setError(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Construir parámetros
            const params = new URLSearchParams();
            if (cede) params.append('cede', cede);
            if (buscar) params.append('buscar', buscar);

            const url = `/api/reportes/tabla/${tabla}?${params.toString()}`;
            
            const response = await api.get(url);
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al cargar los datos');
            }

            setDatos(data.datos || []);
            
            if (data.datos && data.datos.length > 0) {
                setColumnas(Object.keys(data.datos[0]));
            } else {
                setColumnas([]);
            }

        } catch (err) {
            console.error('Error cargando datos:', err);
            setError(err.response?.data?.error || err.message || 'Error de conexión');
            setDatos([]);
            setColumnas([]);
        } finally {
            setLoading(false);
        }
    }, [tabla, cede, buscar]);
    // Cargar datos cuando cambian los filtros
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // ---------- Atajo Ctrl+K ----------
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                buscarInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ---------- Handlers ----------
    const handleTablaChange = (nuevaTabla) => {
        setTabla(nuevaTabla);
        setFilaSeleccionada(null);
        setBuscar(''); // Limpiar búsqueda al cambiar tabla
    };

    const handleCedeChange = (nuevaCede) => {
        setCede(nuevaCede);
        setFilaSeleccionada(null);
    };

    const handleBuscarChange = (valor) => {
        setBuscar(valor);
        setFilaSeleccionada(null);
    };

    const handleFilaClick = (index) => {
        setFilaSeleccionada(index);
    };

    // ---------- Descargar Excel ----------
      // ---------- Descargar Excel ----------
    const descargarExcel = async (tablaDescarga) => {
        try {
            const response = await api.get(`/api/reportes/descargar/${tablaDescarga}`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${tablaDescarga}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Error descargando Excel:', err);
            setError('Error al descargar el archivo Excel');
        }
    };

    // ---------- Helpers ----------
    const formatearColumna = (col) => {
        return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getNombreTabla = () => {
        switch (tabla) {
            case 'estudiantes': return 'Estudiantes';
            case 'personal_universidad': return 'Funcionarios';
            case 'registros': return 'Respuestas';
            default: return 'Seleccione una tabla';
        }
    };

    // ---------- Render ----------
    return (
        <Layout user={user} activeSection="bases-datos" onLogout={handleLogout}>
            <div className="content-area">
                <h1 className="page-title">Contenido: {getNombreTabla()}</h1>

                {/* Mensaje de error */}
                {error && (
                    <div className="error-banner">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="error-close">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="filters" id="filterForm">
                    <div className="filter-group">
                        <label className="filter-label">Tabla</label>
                        <select
                            className="filter-select"
                            value={tabla}
                            onChange={(e) => handleTablaChange(e.target.value)}
                        >
                            <option value="">Seleccione</option>
                            <option value="estudiantes">Estudiantes</option>
                            <option value="registros">Respuestas</option>
                            <option value="personal_universidad">Funcionarios</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Ciudad</label>
                        <select
                            className="filter-select"
                            value={cede}
                            onChange={(e) => handleCedeChange(e.target.value)}
                        >
                            <option value="">Todas</option>
                            <option value="Santa Marta">Santa Marta</option>
                            <option value="Barranquilla">Barranquilla</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Buscar</label>
                        <div className="filter-search-icon">
                            <i className="fas fa-search"></i>
                            <input
                                ref={buscarInputRef}
                                type="text"
                                name="buscar"
                                className="filter-input"
                                placeholder="Cédula o Nombre (Ctrl+K)"
                                value={buscar}
                                onChange={(e) => handleBuscarChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Contador de resultados */}
                {tabla && !loading && datos.length > 0 && (
                    <div className="resultados-info">
                        <span>Mostrando {datos.length} registros</span>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="table-container">
                        <div className="loading-state">
                            <i className="fas fa-spinner fa-spin"></i>
                            <span>Cargando datos...</span>
                        </div>
                    </div>
                ) : datos.length > 0 ? (
                    <div className="table-container">
                        <table id="dataTable">
                            <thead>
                                <tr>
                                    {columnas.map((col) => (
                                        <th key={col}>{formatearColumna(col)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {datos.map((fila, idx) => (
                                    <tr
                                        key={idx}
                                        className={filaSeleccionada === idx ? 'fila-seleccionada' : ''}
                                        onClick={() => handleFilaClick(idx)}
                                    >
                                        {columnas.map((col) => (
                                            <td key={col}>
                                                {fila[col] !== null && fila[col] !== undefined && fila[col] !== '' ? (
                                                    fila[col]
                                                ) : (
                                                    <span className="empty-cell">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="table-container">
                        <div className="vacio">
                            <i className="fas fa-inbox"></i>
                            {tabla 
                                ? (error ? 'Error al cargar los datos.' : 'No hay datos en esta tabla.') 
                                : 'Seleccione una tabla para ver los datos.'}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-label">Descargar Excel</span>
                    <button 
                        onClick={() => descargarExcel('estudiantes')} 
                        className="footer-btn footer-btn-green"
                        disabled={!tabla}
                    >
                        <i className="fas fa-download"></i> Estudiantes
                    </button>
                    <button 
                        onClick={() => descargarExcel('personal_universidad')} 
                        className="footer-btn footer-btn-blue"
                        disabled={!tabla}
                    >
                        <i className="fas fa-download"></i> Funcionarios
                    </button>
                    <button 
                        onClick={() => descargarExcel('registros')} 
                        className="footer-btn footer-btn-purple"
                        disabled={!tabla}
                    >
                        <i className="fas fa-download"></i> Registros
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

export default BasesDatos;