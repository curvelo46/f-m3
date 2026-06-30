import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api/axiosConfig';
import styles from './Usuarios.module.css';

const Usuarios = () => {
    // ---------- Estados ----------
    const [usuarios, setUsuarios] = useState([]);
    const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', password: '' });
    const [paginaActual, setPaginaActual] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [ordenColumna, setOrdenColumna] = useState(null);
    const [ordenAscendente, setOrdenAscendente] = useState(true);
    const [editando, setEditando] = useState({});

    const searchInputRef = useRef(null);

    // ---------- Cargar usuarios ----------
    const cargarUsuarios = useCallback(async () => {
        setLoading(true);
        setMensaje(null);
        try {
            const response = await api.get('/api/auth/usuarios');
            const data = response.data;
            if (!data.success) throw new Error(data.error || 'Error al cargar usuarios');
            const lista = data.usuarios || [];
            setUsuarios(lista);
            setUsuariosFiltrados(lista);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || err.message });
            setUsuarios([]);
            setUsuariosFiltrados([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);

    // ---------- Atajo Ctrl+K ----------
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ---------- Crear usuario ----------
    const crearUsuario = async (e) => {
        e.preventDefault();
        if (!nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.password) {
            setMensaje({ tipo: 'error', texto: 'Complete todos los campos' });
            return;
        }
        try {
            const response = await api.post('/api/auth/usuarios', nuevoUsuario);
            const data = response.data;
            if (!data.success) throw new Error(data.error || 'Error al crear usuario');
            await cargarUsuarios();
            setNuevoUsuario({ nombre: '', email: '', password: '' });
            setMensaje({ tipo: 'success', texto: data.message || 'Usuario creado correctamente' });
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || err.message });
        }
    };

    // ---------- Editar usuario ----------
    const iniciarEdicion = (u) => {
        setEditando({ ...editando, [u.id]: { nombre: u.nombre, email: u.email, password: '', prioridad: u.prioridad } });
    };

    const actualizarCampoEdicion = (id, campo, valor) => {
        setEditando(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
    };

    const guardarCambios = async (id) => {
        const cambios = editando[id];
        if (!cambios) return;
        try {
            const payload = {};
            if (cambios.nombre) payload.nombre = cambios.nombre;
            if (cambios.email) payload.email = cambios.email;
            if (cambios.password) payload.password = cambios.password;
            const response = await api.put(`/api/auth/usuarios/${id}`, payload);
            const data = response.data;
            if (!data.success) throw new Error(data.error || 'Error al actualizar usuario');
            await cargarUsuarios();
            setEditando(prev => { const n = { ...prev }; delete n[id]; return n; });
            setMensaje({ tipo: 'success', texto: data.message || 'Cambios guardados' });
            setTimeout(() => setMensaje(null), 2000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || err.message });
        }
    };

    // ---------- Eliminar usuario ----------
    const eliminarUsuario = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        try {
            const response = await api.delete(`/api/auth/usuarios/${id}`);
            const data = response.data;
            if (!data.success) throw new Error(data.error || 'Error al eliminar usuario');
            await cargarUsuarios();
            setMensaje({ tipo: 'success', texto: data.message || 'Usuario eliminado' });
            setTimeout(() => setMensaje(null), 2000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || err.message });
        }
    };

    // ---------- Cambiar prioridad ----------
    const cambiarPrioridad = async (id, prioridad) => {
        try {
            const response = await api.put(`/api/auth/usuarios/${id}/prioridad`, { prioridad: parseInt(prioridad) });
            const data = response.data;
            if (!data.success) throw new Error(data.error || 'Error al cambiar prioridad');
            await cargarUsuarios();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.error || err.message });
        }
    };

    // ---------- Filtrar ----------
    const filtrarTabla = (query) => {
        if (!query) {
            setUsuariosFiltrados(usuarios);
        } else {
            const q = query.toLowerCase();
            setUsuariosFiltrados(usuarios.filter(u =>
                u.nombre.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.id.toString().includes(q)
            ));
        }
        setPaginaActual(1);
    };

    // ---------- Ordenar ----------
    const ordenarTabla = (campo) => {
        if (ordenColumna === campo) {
            setOrdenAscendente(!ordenAscendente);
        } else {
            setOrdenColumna(campo);
            setOrdenAscendente(true);
        }
        const sorted = [...usuariosFiltrados].sort((a, b) => {
            let valA = a[campo];
            let valB = b[campo];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return ordenAscendente ? -1 : 1;
            if (valA > valB) return ordenAscendente ? 1 : -1;
            return 0;
        });
        setUsuariosFiltrados(sorted);
    };

    // ---------- Paginación ----------
    const totalPaginas = Math.ceil(usuariosFiltrados.length / pageSize) || 1;
    const inicio = (paginaActual - 1) * pageSize;
    const fin = Math.min(paginaActual * pageSize, usuariosFiltrados.length);
    const paginaUsuarios = usuariosFiltrados.slice(inicio, fin);

    const irPagina = (p) => { if (p >= 1 && p <= totalPaginas) setPaginaActual(p); };
    const cambiarPageSize = (size) => { setPageSize(parseInt(size)); setPaginaActual(1); };

    // ---------- Exportar ----------
    const exportarCSV = () => {
        let csv = 'ID,Nombre,Email,Prioridad\n';
        usuariosFiltrados.forEach(u => { csv += `${u.id},"${u.nombre}","${u.email}",${u.prioridad}\n`; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const exportarPDF = () => {
        alert('Exportación a PDF requiere una librería como jsPDF.');
    };

    const avatarColors = ['avatarBlue', 'avatarPurple', 'avatarGreen', 'avatarOrange'];
    const getAvatarColor = (index) => avatarColors[index % avatarColors.length];

    const getSortIcon = (campo) => {
        if (ordenColumna !== campo) return <i className="fas fa-sort" style={{ opacity: 0.3 }}></i>;
        return <i className={`fas fa-sort-${ordenAscendente ? 'up' : 'down'}`}></i>;
    };

    const cerrarSesion = () => {
        sessionStorage.clear();
        localStorage.removeItem('sessionData');
        window.location.href = '/login';
    };

    // ---------- Render ----------
    return (
        <div className={styles.usuariosPage}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <i className={`fas fa-bolt ${styles.logoIcon}`}></i>
                    <h1>Sistema Admin</h1>
                </div>
                <ul className={styles.navMenu}>
                    <li className={styles.navItem}><a href="/panel" className={styles.navLink}><i className="fas fa-home"></i><span>Dashboard</span></a></li>
                    <li className={styles.navItem}><a href="/usuarios" className={`${styles.navLink} ${styles.active}`}><i className="fas fa-user-friends"></i><span>Usuarios</span></a></li>
                    <li className={styles.navItem}><a href="/tablas" className={styles.navLink}><i className="fas fa-database"></i><span>Bases de Datos</span></a></li>
                    <li className={styles.navItem}><a href="/actividades" className={styles.navLink}><i className="far fa-clock"></i><span>Actividades</span></a></li>
                    <li className={styles.navItem}><a href="/graficas" className={styles.navLink}><i className="fas fa-chart-line"></i><span>Gráficas y Reportes</span></a></li>
                    <li className={styles.navItem}><a href="/upload" className={styles.navLink}><i className="fas fa-cloud-upload-alt"></i><span>Importar Excel</span></a></li>
                    <li className={styles.navItem}><a href="/configuracion" className={styles.navLink}><i className="fas fa-cog"></i><span>Configuración</span></a></li>
                    <li className={styles.navItem}><a href="/logs" className={styles.navLink}><i className="fas fa-file-alt"></i><span>Logs del Sistema</span></a></li>
                </ul>
                <div className={styles.userCard}>
                    <div className={styles.userAvatar}>SA</div>
                    <div className={styles.userName}>Sistema Admin</div>
                    <div className={styles.userRole}>Administrador</div>
                </div>
                <button className={styles.logoutBtn} onClick={cerrarSesion}>
                    <i className="fas fa-sign-out-alt"></i><span>Cerrar sesión</span>
                </button>
            </aside>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topBar}>
                    <div className={styles.breadcrumb}>
                        <i className="fas fa-bars" onClick={() => setSidebarOpen(!sidebarOpen)}></i>
                        <label className={styles.current}>gestion de usuario</label>
                    </div>
                    <div className={styles.topBarRight}>
                        <div className={styles.searchBox}>
                            <i className="fas fa-search"></i>
                            <input type="text" placeholder="Buscar..." />
                            <span className={styles.searchShortcut}>Ctrl + K</span>
                        </div>
                        <div className={styles.topIcon}><i className="far fa-bell"></i><span className={styles.badge}>3</span></div>
                        <div className={styles.topIcon}><a href="/configuracion" className="far fa-sun" style={{ color: 'inherit', textDecoration: 'none' }}></a></div>
                        <div className={styles.topAvatar}>SA</div>
                    </div>
                </header>

                {/* Content Area */}
                <div className={styles.contentArea}>
                    {/* Flash Messages */}
                    {mensaje && (
                        <div className={styles.flashContainer}>
                            <div className={`${styles.flashCard} ${styles[mensaje.tipo]}`}>
                                <span className={styles.icon}>{mensaje.tipo === 'success' ? '✅' : '⚠️'}</span>
                                <p>{mensaje.texto}</p>
                                <button className={styles.flashClose} onClick={() => setMensaje(null)}><i className="fas fa-times"></i></button>
                            </div>
                        </div>
                    )}

                    {/* Form Card */}
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <div className={styles.formTitleArea}>
                                <div className={styles.formIcon}><i className="fas fa-user-plus"></i></div>
                                <div className={styles.formTitleText}>
                                    <h2>Registrar Usuario</h2>
                                    <p>Completa la información para crear un nuevo usuario en el sistema</p>
                                </div>
                            </div>
                            <div className={styles.formIllustration}>
                                <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="10" y="10" width="60" height="45" rx="4" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5"/>
                                    <circle cx="30" cy="28" r="7" fill="#bfdbfe"/>
                                    <rect x="22" y="38" width="16" height="3" rx="1.5" fill="#bfdbfe"/>
                                    <rect x="22" y="44" width="12" height="2" rx="1" fill="#bfdbfe"/>
                                    <rect x="45" y="22" width="18" height="2" rx="1" fill="#bfdbfe"/>
                                    <rect x="45" y="28" width="14" height="2" rx="1" fill="#bfdbfe"/>
                                    <rect x="45" y="34" width="16" height="2" rx="1" fill="#bfdbfe"/>
                                    <circle cx="82" cy="48" r="12" fill="#22c55e"/>
                                    <path d="M77 48L80 51L87 44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="75" cy="15" r="6" fill="#fbbf24"/>
                                    <circle cx="88" cy="20" r="4" fill="#fbbf24" opacity="0.6"/>
                                    <circle cx="68" cy="22" r="3" fill="#fbbf24" opacity="0.4"/>
                                </svg>
                            </div>
                        </div>
                        <form onSubmit={crearUsuario}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Nombre Identificador</label>
                                    <div className={styles.inputWrapper}>
                                        <i className="far fa-user"></i>
                                        <input type="text" placeholder="Ej: nombre_usuario" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} required />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Correo Electrónico</label>
                                    <div className={styles.inputWrapper}>
                                        <i className="far fa-envelope"></i>
                                        <input type="email" placeholder="usuario@correo.com" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })} required />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Contraseña</label>
                                    <div className={styles.inputWrapper}>
                                        <i className="fas fa-lock"></i>
                                        <input type="text" placeholder="Mínimo 8 caracteres" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className={styles.btnPrimary}><i className="far fa-floppy-disk"></i> Guardar Usuario</button>
                        </form>
                    </div>

                    {/* Table Card */}
                    <div className={styles.tableCard}>
                        <div className={styles.tableHeader}>
                            <div className={styles.tableTitle}><i className="fas fa-users"></i><h3>Usuarios Registrados</h3></div>
                            <div className={styles.tableActions}>
                                <div className={styles.searchTable}>
                                    <i className="fas fa-magnifying-glass"></i>
                                    <input ref={searchInputRef} type="text" placeholder="Buscar usuario..." onChange={(e) => filtrarTabla(e.target.value)} />
                                </div>
                                <button className={styles.btnFilter} onClick={cargarUsuarios}><i className="fas fa-rotate"></i> Recargar</button>
                            </div>
                        </div>
                        <table className={styles.tableUsuarios}>
                            <thead>
                                <tr>
                                    <th onClick={() => ordenarTabla('id')} style={{ cursor: 'pointer' }}>ID {getSortIcon('id')}</th>
                                    <th onClick={() => ordenarTabla('nombre')} style={{ cursor: 'pointer' }}>Nombre Identificador {getSortIcon('nombre')}</th>
                                    <th onClick={() => ordenarTabla('email')} style={{ cursor: 'pointer' }}>Correo Electrónico {getSortIcon('email')}</th>
                                    <th>Contraseña</th>
                                    <th onClick={() => ordenarTabla('prioridad')} style={{ cursor: 'pointer' }}>Prioridad {getSortIcon('prioridad')}</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className={styles.loadingCell}><i className="fas fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>
                                ) : paginaUsuarios.length === 0 ? (
                                    <tr><td colSpan="6" className={styles.emptyCell}><i className="fas fa-inbox"></i> No se encontraron usuarios</td></tr>
                                ) : (
                                    paginaUsuarios.map((u, idx) => {
                                        const edit = editando[u.id];
                                        return (
                                            <tr key={u.id}>
                                                <td>{u.id}</td>
                                                <td>
                                                    <div className={styles.avatarCell}>
                                                        <div className={`${styles.tableAvatar} ${styles[getAvatarColor(idx)]}`}>{u.nombre.charAt(0).toUpperCase()}</div>
                                                        {edit ? (
                                                            <input type="text" value={edit.nombre} onChange={(e) => actualizarCampoEdicion(u.id, 'nombre', e.target.value)} className={styles.inlineInput} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '13px', color: '#374151' }} />
                                                        ) : (<span>{u.nombre}</span>)}
                                                    </div>
                                                </td>
                                                <td>
                                                    {edit ? (
                                                        <input type="email" value={edit.email} onChange={(e) => actualizarCampoEdicion(u.id, 'email', e.target.value)} className={styles.inlineInput} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '13px', color: '#374151' }} />
                                                    ) : (<span>{u.email}</span>)}
                                                </td>
                                                <td>
                                                    <div className={styles.passwordCell}>
                                                        <span className={styles.dots}>••••••••</span>
                                                        {edit && <input type="password" placeholder="Nueva contraseña" value={edit.password} onChange={(e) => actualizarCampoEdicion(u.id, 'password', e.target.value)} className={`${styles.passwordInput} ${styles.inlineInput}`} />}
                                                    </div>
                                                </td>
                                                <td>
                                                    <select value={edit ? edit.prioridad : u.prioridad} onChange={(e) => { if (edit) { actualizarCampoEdicion(u.id, 'prioridad', parseInt(e.target.value)); } else { cambiarPrioridad(u.id, e.target.value); } }} className={`${styles.priorityBadge} ${(edit ? edit.prioridad : u.prioridad) === 0 ? styles.priorityHigh : styles.priorityMedium}`}>
                                                        <option value={0}>0 - Alta</option>
                                                        <option value={1}>1 - Media</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <div className={styles.actionBtns}>
                                                        {edit ? (
                                                            <button className={`${styles.btnAction} ${styles.btnEdit}`} onClick={() => guardarCambios(u.id)} title="Guardar cambios"><i className="fas fa-check"></i></button>
                                                        ) : (
                                                            <button className={`${styles.btnAction} ${styles.btnEdit}`} onClick={() => iniciarEdicion(u)} title="Editar usuario"><i className="fas fa-pen"></i></button>
                                                        )}
                                                        <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => eliminarUsuario(u.id)} title="Eliminar usuario"><i className="fas fa-trash"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <div className={styles.tableFooter}>
                            <span>Mostrando {usuariosFiltrados.length === 0 ? 0 : inicio + 1} a {fin} de {usuariosFiltrados.length} usuarios</span>
                            <div className={styles.paginationWrapper}>
                                <div className={styles.pagination}>
                                    <button className={`${styles.pageBtn} ${paginaActual === 1 ? styles.disabled : ''}`} onClick={() => irPagina(paginaActual - 1)} disabled={paginaActual === 1}><i className="fas fa-chevron-left"></i></button>
                                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                                        <button key={p} className={`${styles.pageBtn} ${p === paginaActual ? styles.active : ''}`} onClick={() => irPagina(p)}>{p}</button>
                                    ))}
                                    <button className={`${styles.pageBtn} ${paginaActual === totalPaginas ? styles.disabled : ''}`} onClick={() => irPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}><i className="fas fa-chevron-right"></i></button>
                                </div>
                                <select className={styles.pageSize} value={pageSize} onChange={(e) => cambiarPageSize(e.target.value)}>
                                    <option value={10}>10 por página</option>
                                    <option value={20}>20 por página</option>
                                    <option value={50}>50 por página</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className={styles.bottomBar}>
                    <div className={styles.exportArea}>
                        <span className={styles.exportLabel}>Exportar datos:</span>
                        <div className={styles.exportBtns}>
                            <button className={styles.btnExport} onClick={exportarCSV}><i className="fas fa-file-csv" style={{ color: '#2563eb' }}></i> CSV</button>
                            <button className={styles.btnExport} onClick={exportarPDF}><i className="fas fa-file-pdf" style={{ color: '#dc2626' }}></i> PDF</button>
                        </div>
                    </div>
                    <div className={styles.footerInfo}>
                        <span><i className="fas fa-shield-halved" style={{ color: '#10b981' }}></i> Sistema seguro</span>
                        <span>•</span>
                        <span>v1.0.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Usuarios;