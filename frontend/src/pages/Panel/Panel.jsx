import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanel } from '../../hooks/usePanel.js';
import styles from './Panel.module.css';

const Panel = () => {
    const { user, handleLogout } = usePanel();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-home', path: '/panel' },
        { id: 'usuarios', label: 'Usuarios', icon: 'fa-user-friends', path: '/usuarios' },
        { id: 'bases', label: 'Bases de Datos', icon: 'fa-database', path: '/tablas' },
        { id: 'actividades', label: 'Actividades', icon: 'fa-clock', path: '/actividades' },
        { id: 'graficas', label: 'Gráficas y Reportes', icon: 'fa-chart-line', path: '/graficas' },
        { id: 'upload', label: 'Importar Excel', icon: 'fa-cloud-upload-alt', path: '/upload' },
        { id: 'config', label: 'Configuración', icon: 'fa-cog', path: '/configuracion' },
        { id: 'logs', label: 'Logs del Sistema', icon: 'fa-file-alt', path: '/logs' },
    ];

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleSidebar = () => setSidebarOpen(prev => !prev);

    const handleNavClick = (path) => {
        navigate(path);
        if (window.innerWidth <= 1024) {
            setSidebarOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="panel-loading">
                <div className="spinner"></div>
                <p>Cargando panel...</p>
            </div>
        );
    }

    return (
        <div className={styles.panelPage}>
            {/* ===== SIDEBAR ===== */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <i className={`fas fa-bolt ${styles.logoIcon}`}></i>
                    <h1>Sistema Admin</h1>
                </div>

                <ul className="nav-menu">
                    {menuItems.map(item => (
                        <li key={item.id} className="nav-item">
                            <a 
                                href={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavClick(item.path);
                                }}
                                className={`nav-link ${item.id === 'dashboard' ? 'active' : ''}`}
                            >
                                <i className={`fas ${item.icon}`}></i>
                                <span>{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="user-card">
                    <div className="user-avatar">
                        {(user?.nombre || 'SA').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="user-name">{user?.nombre || 'Sistema Admin'}</div>
                    <div className="user-role">Administrador</div>
                </div>

                <button className="logout-btn" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Cerrar sesión</span>
                </button>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
              <div className={styles.mainContent}>
                <header className={styles.topBar}>
                    <div className={styles.breadcrumb}>
                        <i className="fas fa-bars" onClick={() => setSidebarOpen(!sidebarOpen)}></i>
                        <span className={styles.current}>Dashboard</span>
                    </div>
                    <div className="top-bar-right">
                        <div className="search-box">
                            <i className="fas fa-search"></i>
                            <input 
                                type="text" 
                                id="searchInput"
                                placeholder="Buscar..."
                            />
                            <span className="search-shortcut">Ctrl + K</span>
                        </div>
                        <div className="top-icon">
                            <i className="far fa-bell"></i>
                            <span className="badge">3</span>
                        </div>
                        <div className="top-icon">
                            <a href="/configuracion" className="config-link" onClick={(e) => { e.preventDefault(); handleNavClick('/configuracion'); }}>
                                <i className="far fa-sun"></i>
                            </a>
                        </div>
                        <div className="top-avatar">
                            {(user?.nombre || 'SA').slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className={styles.contentArea}>
      <div className={styles.welcomeSection}>
       <h2>Bienvenido al Dashboard</h2>
                        <p>Aquí puedes gestionar usuarios, revisar reportes, configurar el sistema y mucho más.</p>
      </div>

                    <div className={styles.imageSection}>
                        <img src="/img/images.png" alt="Dashboard" />
                        <div className={styles.motivationalQuote }>
                            <i className={styles.quoteIcon}></i>
                            <p className={styles.quoteText}>
                                "Cada día que dedicas al estudio es un escalón que te acerca a tus sueños. 
                                El conocimiento que construyes hoy será el puente hacia el futuro que imaginas. 
                                No se trata solo de aprobar, se trata de <strong>transformar tu vida</strong>."
                            </p>
                            <div className={styles.quoteFooter}>
                                <span className={styles.quoteLine}></span>
                                <span className={styles.quoteAuthor}>— Sistema Admin</span>
                                <span className={styles.quoteLine}></span>
                            </div>
                            <div className={styles.quoteStats}>
                                <div className={styles.statItem}>
                                    <i className="fas fa-book-open"></i>
                                    <span>Aprende</span>
                                </div>
                                <div className={styles.statItem}>
                                    <i className="fas fa-lightbulb"></i>
                                    <span>Crece</span>
                                </div>
                                <div className={styles.statItem}>
                                    <i className="fas fa-trophy"></i>
                                    <span>Triunfa</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Panel;