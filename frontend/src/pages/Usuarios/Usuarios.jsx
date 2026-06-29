import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import api from '../../api/axiosConfig';  // ← Usar axios como los otros componentes
import Layout from '../../components/Layout/Layout.jsx';
import './Usuarios.css';

const Usuarios = () => {
    const { user, handleLogout } = usePanel();

    // ---------- Estados ----------
    const [usuarios, setUsuarios] = useState([]);
    const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);

    // Formulario nuevo usuario
    const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', password: '' });

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Ordenamiento
    const [ordenColumna, setOrdenColumna] = useState(null);
    const [ordenAscendente, setOrdenAscendente] = useState(true);

    // Edición inline
    const [editando, setEditando] = useState({}); // { [id]: { nombre, email, password, prioridad } }

    const searchInputRef = useRef(null);

    // ---------- Cargar usuarios desde la API ----------
    const cargarUsuarios = useCallback(async () => {
        setLoading(true);
        setMensaje(null);
        try {
            const response = await api.get('/api/auth/usuarios');
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al cargar usuarios');
            }

            const lista = data.usuarios || [];
            setUsuarios(lista);
            setUsuariosFiltrados(lista);
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            setMensaje({ 
                tipo: 'error', 
                texto: err.response?.data?.error || err.message || 'Error al cargar usuarios' 
            });
            setUsuarios([]);
            setUsuariosFiltrados([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarUsuarios();
    }, [cargarUsuarios]);

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

            if (!data.success) {
                throw new Error(data.error || 'Error al crear usuario');
            }

            // Recargar la lista para obtener el usuario con ID real
            await cargarUsuarios();

            setNuevoUsuario({ nombre: '', email: '', password: '' });
            setMensaje({ tipo: 'success', texto: data.message || 'Usuario creado correctamente' });
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            console.error(err);
            setMensaje({ 
                tipo: 'error', 
                texto: err.response?.data?.error || err.message || 'Error al crear usuario' 
            });
        }
    };

    // ---------- Editar usuario ----------
    const iniciarEdicion = (u) => {
        setEditando({
            ...editando,
            [u.id]: { nombre: u.nombre, email: u.email, password: '', prioridad: u.prioridad }
        });
    };

    const actualizarCampoEdicion = (id, campo, valor) => {
        setEditando(prev => ({
            ...prev,
            [id]: { ...prev[id], [campo]: valor }
        }));
    };

    const guardarCambios = async (id) => {
        const cambios = editando[id];
        if (!cambios) return;
        try {
            // Solo enviar campos que tengan valor (password vacío = no cambiar)
            const payload = {};
            if (cambios.nombre) payload.nombre = cambios.nombre;
            if (cambios.email) payload.email = cambios.email;
            if (cambios.password) payload.password = cambios.password;

            const response = await api.put(`/api/auth/usuarios/${id}`, payload);
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al actualizar usuario');
            }

            // Recargar lista para reflejar cambios
            await cargarUsuarios();

            setEditando(prev => { const n = { ...prev }; delete n[id]; return n; });
            setMensaje({ tipo: 'success', texto: data.message || 'Cambios guardados' });
            setTimeout(() => setMensaje(null), 2000);
        } catch (err) {
            console.error(err);
            setMensaje({ 
                tipo: 'error', 
                texto: err.response?.data?.error || err.message || 'Error al guardar cambios' 
            });
        }
    };

    // ---------- Eliminar usuario ----------
    const eliminarUsuario = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        try {
            const response = await api.delete(`/api/auth/usuarios/${id}`);
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al eliminar usuario');
            }

            await cargarUsuarios();
            setMensaje({ tipo: 'success', texto: data.message || 'Usuario eliminado' });
            setTimeout(() => setMensaje(null), 2000);
        } catch (err) {
            console.error(err);
            setMensaje({ 
                tipo: 'error', 
                texto: err.response?.data?.error || err.message || 'Error al eliminar usuario' 
            });
        }
    };

    // ---------- Cambiar prioridad ----------
    const cambiarPrioridad = async (id, prioridad) => {
        try {
            const response = await api.put(`/api/auth/usuarios/${id}/prioridad`, { prioridad: parseInt(prioridad) });
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al cambiar prioridad');
            }

            await cargarUsuarios();
        } catch (err) {
            console.error(err);
            setMensaje({ 
                tipo: 'error', 
                texto: err.response?.data?.error || err.message || 'Error al cambiar prioridad' 
            });
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

    const irPagina = (p) => {
        if (p >= 1 && p <= totalPaginas) setPaginaActual(p);
    };

    const cambiarPageSize = (size) => {
        setPageSize(parseInt(size));
        setPaginaActual(1);
    };

    // ---------- Exportar ----------
    const exportarCSV = () => {
        let csv = 'ID,Nombre,Email,Prioridad\n';
        usuariosFiltrados.forEach(u => {
            csv += `${u.id},"${u.nombre}","${u.email}",${u.prioridad}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const exportarPDF = () => {
        alert('Exportación a PDF requiere una librería como jsPDF. Implementa según tu stack.');
    };

const avatarColors = ['usu-avatar-blue', 'usu-avatar-purple', 'usu-avatar-green', 'usu-avatar-orange'];
const getAvatarColor = (index) => avatarColors[index % avatarColors.length];

    const getSortIcon = (campo) => {
        if (ordenColumna !== campo) return <i className="fas fa-sort" style={{ opacity: 0.3 }}></i>;
        return <i className={`fas fa-sort-${ordenAscendente ? 'up' : 'down'}`}></i>;
    };

    // ---------- Render ----------
    return (
        <Layout user={user} activeSection="usuarios" onLogout={handleLogout}>
            <div data-component="usuarios">   {/* ← AGREGA ESTA LÍNEA */}
            <div className="content-area">
                {/* Flash Messages */}
                {mensaje && (
                    <div className="flash-container">
                        <div className={`flash-card ${mensaje.tipo}`}>
                            <span className="icon">{mensaje.tipo === 'success' ? '✅' : '⚠️'}</span>
                            <p>{mensaje.texto}</p>
                            <button
                                className="flash-close"
                                onClick={() => setMensaje(null)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.5 }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <div className="form-card">
                    <div className="form-header">
                        <div className="form-title-area">
                            <div className="form-icon">
                                <i className="fas fa-user-plus"></i>
                            </div>
                            <div className="form-title-text">
                                <h2>Registrar Usuario</h2>
                                <p>Completa la información para crear un nuevo usuario en el sistema</p>
                            </div>
                        </div>
                        <div className="form-illustration">
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

                    <form onSubmit={crearUsuario} id="formUsuario">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre Identificador</label>
                                <div className="input-wrapper">
                                    <i className="far fa-user"></i>
                                    <input
                                        type="text"
                                        name="nombre"
                                        placeholder="Ej: nombre_usuario"
                                        value={nuevoUsuario.nombre}
                                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Correo Electrónico</label>
                                <div className="input-wrapper">
                                    <i className="far fa-envelope"></i>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="usuario@correo.com"
                                        value={nuevoUsuario.email}
                                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Contraseña</label>
                                <div className="input-wrapper">
                                    <i className="fas fa-lock"></i>
                                    <input
                                        type="text"
                                        name="password"
                                        placeholder="Mínimo 8 caracteres"
                                        value={nuevoUsuario.password}
                                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary">
                            <i className="far fa-floppy-disk"></i>
                            Guardar Usuario
                        </button>
                    </form>
                </div>

                {/* Table Card */}
                <div className="table-card">
                    <div className="table-header">
                        <div className="table-title">
                            <i className="fas fa-users"></i>
                            <h3>Usuarios Registrados</h3>
                        </div>
                        <div className="table-actions">
                            <div className="search-table">
                                <i className="fas fa-magnifying-glass"></i>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    onChange={(e) => filtrarTabla(e.target.value)}
                                />
                            </div>
                            <button className="btn-filter" onClick={cargarUsuarios}>
                                <i className="fas fa-rotate"></i>
                                Recargar
                            </button>
                        </div>
                    </div>

                    <table id="tablaUsuarios">
                        <thead>
                            <tr>
                                <th onClick={() => ordenarTabla('id')} style={{ cursor: 'pointer' }}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th onClick={() => ordenarTabla('nombre')} style={{ cursor: 'pointer' }}>
                                    Nombre Identificador {getSortIcon('nombre')}
                                </th>
                                <th onClick={() => ordenarTabla('email')} style={{ cursor: 'pointer' }}>
                                    Correo Electrónico {getSortIcon('email')}
                                </th>
                                <th>Contraseña</th>
                                <th onClick={() => ordenarTabla('prioridad')} style={{ cursor: 'pointer' }}>
                                    Prioridad {getSortIcon('prioridad')}
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                                        Cargando usuarios...
                                    </td>
                                </tr>
                            ) : paginaUsuarios.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                                        <i className="fas fa-inbox" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                paginaUsuarios.map((u, idx) => {
                                    const edit = editando[u.id];
                                    return (
                                        <tr key={u.id} data-id={u.id}>
                                            <td>{u.id}</td>
                                            <td>
                                                <div className="avatar-cell">
                                                    <div className={`table-avatar ${getAvatarColor(idx)}`}>
                                                        {u.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    {edit ? (
                                                        <input
                                                            type="text"
                                                            value={edit.nombre}
                                                            onChange={(e) => actualizarCampoEdicion(u.id, 'nombre', e.target.value)}
                                                            className="inline-input"
                                                        />
                                                    ) : (
                                                        <span>{u.nombre}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {edit ? (
                                                    <input
                                                        type="email"
                                                        value={edit.email}
                                                        onChange={(e) => actualizarCampoEdicion(u.id, 'email', e.target.value)}
                                                        className="inline-input"
                                                    />
                                                ) : (
                                                    <span>{u.email}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="password-cell">
                                                    <span className="dots">••••••••</span>
                                                    {edit && (
                                                        <input
                                                            type="password"
                                                            className="password-input inline-input"
                                                            placeholder="Nueva contraseña"
                                                            value={edit.password}
                                                            onChange={(e) => actualizarCampoEdicion(u.id, 'password', e.target.value)}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    value={edit ? edit.prioridad : u.prioridad}
                                                    onChange={(e) => {
                                                        if (edit) {
                                                            actualizarCampoEdicion(u.id, 'prioridad', parseInt(e.target.value));
                                                        } else {
                                                            cambiarPrioridad(u.id, e.target.value);
                                                        }
                                                    }}
                                                    className={`priority-badge ${(edit ? edit.prioridad : u.prioridad) === 0 ? 'priority-high' : 'priority-medium'}`}
                                                >
                                                    <option value={0}>0 - Alta</option>
                                                    <option value={1}>1 - Media</option>
                                                </select>
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    {edit ? (
                                                        <button
                                                            className="btn-action btn-edit"
                                                            onClick={() => guardarCambios(u.id)}
                                                            title="Guardar cambios"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn-action btn-edit"
                                                            onClick={() => iniciarEdicion(u)}
                                                            title="Editar usuario"
                                                        >
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-action btn-delete"
                                                        onClick={() => eliminarUsuario(u.id)}
                                                        title="Eliminar usuario"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    <div className="table-footer">
                        <span>Mostrando {usuariosFiltrados.length === 0 ? 0 : inicio + 1} a {fin} de {usuariosFiltrados.length} usuarios</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="pagination" id="pagination">
                                <button
                                    className={`page-btn ${paginaActual === 1 ? 'disabled' : ''}`}
                                    onClick={() => irPagina(paginaActual - 1)}
                                    disabled={paginaActual === 1}
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        className={`page-btn ${p === paginaActual ? 'active' : ''}`}
                                        onClick={() => irPagina(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    className={`page-btn ${paginaActual === totalPaginas ? 'disabled' : ''}`}
                                    onClick={() => irPagina(paginaActual + 1)}
                                    disabled={paginaActual === totalPaginas}
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            <select className="page-size" value={pageSize} onChange={(e) => cambiarPageSize(e.target.value)}>
                                <option value={10}>10 por página</option>
                                <option value={20}>20 por página</option>
                                <option value={50}>50 por página</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bottom-bar">
                <div className="export-area">
                    <span className="export-label">Exportar datos:</span>
                    <div className="export-btns">
                        <button className="btn-export" onClick={exportarCSV}>
                            <i className="fas fa-file-csv csv-icon"></i>
                            CSV
                        </button>
                        <button className="btn-export" onClick={exportarPDF}>
                            <i className="fas fa-file-pdf pdf-icon"></i>
                            PDF
                        </button>
                    </div>
                </div>
                <div className="footer-info">
                    <span><i className="fas fa-shield-halved"></i> Sistema seguro</span>
                    <span>•</span>
                    <span>v1.0.0</span>
                </div>
            </div>
            </div>   {/* ← AGREGA ESTA LÍNEA */}
        </Layout>
    );
};

export default Usuarios;
