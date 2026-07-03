import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children, user, activeSection = 'dashboard', onLogout }) => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

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

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    const handleNavClick = (path) => {
        navigate(path);
        if (window.innerWidth <= 1024) {
            setSidebarOpen(false);
        }
    };

    // Atajo Ctrl+K para buscar
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="layout-page">
            {/* ===== SIDEBAR ===== */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
                <div className="sidebar-header">
                    <i className="fas fa-bolt logo-icon"></i>
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
                                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
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

                <button className="logout-btn" onClick={onLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Cerrar sesión</span>
                </button>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <div className="main-content">
                {/* Top Bar */}
                <header className="top-bar">
                    <div className="breadcrumb">
                        <i className="fas fa-bars" onClick={toggleSidebar}></i>
                        <span className="current">
                            {menuItems.find(m => m.id === activeSection)?.label || 'Configuracion'}
                        </span>
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
                            <a href="/configuracion" className="config-link">
                                <i className="far fa-sun"></i>
                            </a>
                        </div>
                        <div className="top-avatar">
                            {(user?.nombre || 'SA').slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Content Area - Aquí va el contenido de cada página */}
                <div className="content-area">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
