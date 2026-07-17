import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanel } from '../../hooks/usePanel.js';
import styles from './Panel.module.css';

const Panel = () => {
    const { user, handleLogout } = usePanel();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showVersionModal, setShowVersionModal] = useState(false);
    user.prioridad

    const restrictedPaths = ['/usuarios', '/tablas', '/actividades', '/upload', '/logs'];

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-home', path: '/panel' },
        { id: 'usuarios', label: 'Usuarios', icon: 'fa-user-friends', path: '/usuarios' },
        { id: 'bases', label: 'Bases de Datos', icon: 'fa-database', path: '/tablas' },
        { id: 'actividades', label: 'Actividades', icon: 'fa-clock', path: '/actividades' },
        { id: 'graficas', label: 'Gráficas y Reportes', icon: 'fa-chart-line', path: '/graficas' },
        { id: 'upload', label: 'Importar Excel', icon: 'fa-cloud-upload-alt', path: '/upload' },
        { id: 'config', label: 'Configuración', icon: 'fa-cog', path: '/configuracion' },
        { id: 'logs', label: 'Logs del Sistema', icon: 'fa-file-alt', path: '/logs' },
    ].filter(item => !(Number(user?.prioridad) === 1 && restrictedPaths.includes(item.path)));

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
            if (e.key === 'Escape') {
                setShowVersionModal(false);
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
            <div className={styles.panelLoading}>
                <div className={styles.spinner}></div>
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

                <ul className={styles.navMenu}>
                    {menuItems.map(item => (
                        <li key={item.id} className={styles.navItem}>
                            <a 
                                href={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavClick(item.path);
                                }}
                                className={`${styles.navLink} ${item.id === 'dashboard' ? styles.active : ''}`}
                            >
                                <i className={`fas ${item.icon}`}></i>
                                <span>{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>

                <div className={styles.userCard}>
                    <div className={styles.userAvatar}>
                        {(user?.nombre || 'SA').slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.userName}>{user?.nombre || 'Sistema Admin'}</div>
                    <div className={styles.userRole}>Administrador</div>
                </div>

                <button className={styles.logoutBtn} onClick={handleLogout}>
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
                    <div className={styles.topBarRight}>
                        <div className={styles.searchBox}>
                            <i className="fas fa-search"></i>
                            <input 
                                type="text" 
                                id="searchInput"
                                placeholder="Buscar..."
                            />
                            <span className={styles.searchShortcut}>Ctrl + K</span>
                        </div>
                        <div className={styles.topIcon}>
                            <i className="far fa-bell"></i>
                            <span className={styles.badge}>3</span>
                        </div>
                        <div className={styles.topIcon}>
                            <a href="/configuracion" className={styles.configLink} onClick={(e) => { e.preventDefault(); handleNavClick('/configuracion'); }}>
                                <i className="far fa-sun"></i>
                            </a>
                        </div>
                        <div className={styles.topAvatar}>
                            {(user?.nombre || 'SA').slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* ===== CONTENT AREA ===== */}
                <div className={styles.contentArea}>
                    {/* Welcome Section */}
                    <div className={styles.welcomeSection}>
                        <h2>Bienvenido al sistema de gestión de centro médico</h2>
                        <p>Aquí puedes gestionar usuarios, revisar reportes, configurar el sistema y mucho más.</p>
                    </div>

                    {/* Image + Quote Section */}
                    <div className={styles.imageSection}>
                        <img src="/img/images.png" alt="Dashboard" />
                        <div className={styles.motivationalQuote}>
                            <i className={`fas fa-quote-left ${styles.quoteIcon}`}></i>
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

                    {/* Botón para abrir modal de notas de versión */}
                    <div className={styles.versionButtonWrapper}>
                        <button 
                            className={styles.versionButton}
                            onClick={() => setShowVersionModal(true)}
                        >
                            <i className="fas fa-rocket"></i>
                            <div className={styles.versionButtonContent}>
                                <span className={styles.versionButtonLabel}>Novedades</span>
                                <span className={styles.versionButtonVersion}>v2.3</span>
                            </div>
                            <span className={styles.versionButtonBadge}>Nuevo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== MODAL DE NOTAS DE VERSIÓN ===== */}
            {showVersionModal && (
                <div className={styles.modalOverlay} onClick={() => setShowVersionModal(false)}>
                    <div className={styles.versionModal} onClick={(e) => e.stopPropagation()}>
                        {/* Header del modal */}
                        <div className={styles.modalHeader}>
                            <div className={styles.modalHeaderLeft}>
                                <div className={styles.modalIcon}>
                                    <i className="fas fa-rocket"></i>
                                </div>
                                <div>
                                    <h2>Notas de la versión 2.3</h2>
                                    <span className={styles.modalDate}>Publicado el 3 de julio de 2026</span>
                                </div>
                            </div>
                            <button 
                                className={styles.modalCloseBtn}
                                onClick={() => setShowVersionModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Firma del desarrollador */}
                        <div className={styles.devSignature}>
                            <div className={styles.quoteFooter}>
                                <span className={styles.quoteLine}></span>
                                <span className={styles.quoteAuthor}>— Notas del desarrollador</span>
                                <span className={styles.quoteLine}></span>
                            </div>
                            <p className={styles.quoteText}>
                                "Dado a que estaba aburrido en mi casa decidí entretenerme con esto un rato, y como 
                                adquirí conocimiento nuevo, pude hacerlo como quería hacerlo en un principio. Cada tanto le daré mantenimiento para mantenerlo en funcionamiento. 
                                Espero que esta nueva versión sea de su agrado y les ayude en su trabajo. ATT <strong>Andrés Curvelo</strong>."
                            </p>
                        </div>

                        {/* Contenido del modal */}
                        <div className={styles.modalBody}>
                            {/* Cambios principales */}
                            <div className={styles.changeSection}>
                                <h3>
                                    <span className={styles.changeIcon}>🚀</span>
                                    Cambios principales
                                </h3>
                                <ul>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMajor}>Nuevo</span>
                                        Se mejoró la interfaz de usuario para que sea más intuitiva y fácil de usar.
                                    </li>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMajor}>Nuevo</span>
                                        Se agregó un sistema de gráficas para que puedan ver gráficas de lo que pasa en el sistema.
                                    </li>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMajor}>Nuevo</span>
                                        Se agregó un sistema de reporte de errores para que puedan ver los errores del sistema, esta tabla se encuentra en configuración.
                                    </li>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMajor}>Nuevo</span>
                                        Se agregó una tabla en la que se ven las modificaciones que los administradores le hacen al sistema.
                                    </li>

                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMajor}>Nuevo</span>
                                        Se agregó una carta que les permitira descargar un respaldo de la base de datos
                                    </li>

                                    
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMajor}>Nuevo</span>
                                        La funcion guardar lo que hace es que crea una copia internamente en la pagina
                                    </li>
                                </ul>
                            </div>

                            {/* Cambios secundarios */}
                            <div className={styles.changeSection}>
                                <h3>
                                    <span className={styles.changeIcon}>✨</span>
                                    Cambios secundarios
                                </h3>
                                <ul>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMinor}>Mejora</span>
                                        Se agregó una función en configuración para cambiar la foto del fondo del formulario.
                                    </li>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMinor}>Mejora</span>
                                        Se agregó un generador de QR para que puedan generar un QR con la URL del formulario u otras que necesiten y así poder compartirlo más fácil. Solo ponen la URL y le dan generar QR y listo (también pueden escoger el tamaño del QR).
                                    </li>
                                    <li>
                                        <span className={styles.changeTag} className={styles.tagMinor}>Mejora</span>
                                        Un apartado con mi información de contacto por si acaso, junto con un link al repositorio en GitHub donde tengo montado el sistema.
                                    </li>
                                </ul>
                            </div>

                            {/* Nota final */}
                            <div className={styles.noteText}>
                                <i className="fas fa-info-circle"></i>
                                <div>
                                    <strong>Nota del desarrollador:</strong> Estoy trabajando en que la barra de búsqueda funcione y que puedan recibir notificaciones de cuando se llena el formulario, pero eso es un poco más complicado y me va a llevar un tiempo. Como eso es para un proyecto aparte, por ahora lo dejo así, pero en un futuro lo voy a implementar.
                                </div>
                            </div>
                        </div>

                        {/* Footer del modal */}
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.modalCloseAction}
                                onClick={() => setShowVersionModal(false)}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Panel;
