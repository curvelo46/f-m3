import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import api from '../../api/axiosConfig';
import styles from './BasesDatos.module.css';

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
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
        setBuscar('');
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

    const cerrarSesion = () => {
        sessionStorage.clear();
        localStorage.removeItem('sessionData');
        window.location.href = '/login';
    };

    // ---------- Render ----------
    return (
        <div className={styles.basesDatosPage}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <i className={`fas fa-bolt ${styles.logoIcon}`}></i>
                    <h1>Sistema Admin</h1>
                </div>
                <ul className={styles.navMenu}>
                    <li className={styles.navItem}>
                        <a href="/panel" className={styles.navLink}>
                            <i className="fas fa-home"></i><span>Dashboard</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/usuarios" className={styles.navLink}>
                            <i className="fas fa-user-friends"></i><span>Usuarios</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/bases-de-datos" className={`${styles.navLink} ${styles.active}`}>
                            <i className="fas fa-database"></i><span>Bases de Datos</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/actividades" className={styles.navLink}>
                            <i className="far fa-clock"></i><span>Actividades</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/graficas" className={styles.navLink}>
                            <i className="fas fa-chart-line"></i><span>Gráficas y Reportes</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/importar-excel" className={styles.navLink}>
                            <i className="fas fa-cloud-upload-alt"></i><span>Importar Excel</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/configuracion" className={styles.navLink}>
                            <i className="fas fa-cog"></i><span>Configuración</span>
                        </a>
                    </li>
                    <li className={styles.navItem}>
                        <a href="/logs" className={styles.navLink}>
                            <i className="fas fa-file-alt"></i><span>Logs del Sistema</span>
                        </a>
                    </li>
                </ul>
                <div className={styles.userCard}>
                    <div className={styles.userAvatar}>SA</div>
                    <div className={styles.userName}>Sistema Admin</div>
                    <div className={styles.userRole}>Administrador</div>
                </div>
                <button className={styles.logoutBtn} onClick={cerrarSesion}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Cerrar sesión</span>
                </button>
            </aside>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topBar}>
                    <div className={styles.breadcrumb}>
                        <i className="fas fa-bars" onClick={() => setSidebarOpen(!sidebarOpen)}></i>
                        <label className={styles.current}>Bases de Datos</label>
                    </div>
                    <div className={styles.topBarRight}>
                        <div className={styles.searchBox}>
                            <i className="fas fa-search"></i>
                            <input type="text" placeholder="Buscar..." />
                            <span className={styles.searchShortcut}>Ctrl + K</span>
                        </div>
                        <div className={styles.topIcon}>
                            <i className="far fa-bell"></i>
                            <span className={styles.badge}>3</span>
                        </div>
                        <div className={styles.topIcon}>
                            <a href="/configuracion" className="far fa-sun" style={{ color: 'inherit', textDecoration: 'none' }}></a>
                        </div>
                        <div className={styles.topAvatar}>SA</div>
                    </div>
                </header>

                {/* Content Area */}
                <div className={styles.contentArea}>
                    <h1 className={styles.pageTitle}>Contenido: {getNombreTabla()}</h1>

                    {/* Mensaje de error */}
                    {error && (
                        <div className={styles.errorBanner}>
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className={styles.errorClose}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    {/* Filters */}
                    <div className={styles.filters}>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Tabla</label>
                            <select
                                className={styles.filterSelect}
                                value={tabla}
                                onChange={(e) => handleTablaChange(e.target.value)}
                            >
                                <option value="">Seleccione</option>
                                <option value="estudiantes">Estudiantes</option>
                                <option value="registros">Respuestas</option>
                                <option value="personal_universidad">Funcionarios</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Ciudad</label>
                            <select
                                className={styles.filterSelect}
                                value={cede}
                                onChange={(e) => handleCedeChange(e.target.value)}
                            >
                                <option value="">Todas</option>
                                <option value="Santa Marta">Santa Marta</option>
                                <option value="Barranquilla">Barranquilla</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Buscar</label>
                            <div className={styles.filterSearchIcon}>
                                <i className="fas fa-search"></i>
                                <input
                                    ref={buscarInputRef}
                                    type="text"
                                    name="buscar"
                                    className={styles.filterInput}
                                    placeholder="Cédula o Nombre (Ctrl+K)"
                                    value={buscar}
                                    onChange={(e) => handleBuscarChange(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    {tabla && !loading && datos.length > 0 && (
                        <div className={styles.resultadosInfo}>
                            <span>Mostrando {datos.length} registros</span>
                        </div>
                    )}

                    {/* Table */}
                    {loading ? (
                        <div className={styles.tableContainer}>
                            <div className={styles.loadingState}>
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>Cargando datos...</span>
                            </div>
                        </div>
                    ) : datos.length > 0 ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
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
                                            className={filaSeleccionada === idx ? styles.filaSeleccionada : ''}
                                            onClick={() => handleFilaClick(idx)}
                                        >
                                            {columnas.map((col) => (
                                                <td key={col}>
                                                    {fila[col] !== null && fila[col] !== undefined && fila[col] !== '' ? (
                                                        fila[col]
                                                    ) : (
                                                        <span className={styles.emptyCell}>—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <div className={styles.vacio}>
                                <i className="fas fa-inbox"></i>
                                {tabla 
                                    ? (error ? 'Error al cargar los datos.' : 'No hay datos en esta tabla.') 
                                    : 'Seleccione una tabla para ver los datos.'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <span className={styles.footerLabel}>Descargar Excel</span>
                        <button 
                            onClick={() => descargarExcel('estudiantes')} 
                            className={`${styles.footerBtn} ${styles.footerBtnGreen}`}
                            disabled={!tabla}
                        >
                            <i className="fas fa-download"></i> Estudiantes
                        </button>
                        <button 
                            onClick={() => descargarExcel('personal_universidad')} 
                            className={`${styles.footerBtn} ${styles.footerBtnBlue}`}
                            disabled={!tabla}
                        >
                            <i className="fas fa-download"></i> Funcionarios
                        </button>
                        <button 
                            onClick={() => descargarExcel('registros')} 
                            className={`${styles.footerBtn} ${styles.footerBtnPurple}`}
                            disabled={!tabla}
                        >
                            <i className="fas fa-download"></i> Registros
                        </button>
                    </div>
                    <div className={styles.footerRight}>
                        <i className="fas fa-shield-alt"></i>
                        <span>Sistema seguro</span>
                        <span>•</span>
                        <span className={styles.version}>v1.0.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BasesDatos;
