import React, { useState, useEffect } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import Layout from '../../components/Layout/Layout.jsx';
import api from '../../api/axiosConfig.js';  // Tu instancia de axios configurada
import './Actividades.css';

const Actividades = () => {
    const { user, handleLogout } = usePanel();

    // ---------- Estados ----------
    const [filtroTipo, setFiltroTipo] = useState(() => localStorage.getItem('admin_filtro_tipo') || '');
    const [areaFiltroBotones, setAreaFiltroBotones] = useState('');
    const [areaFiltroCombos, setAreaFiltroCombos] = useState('');
    const [areaFiltroTextos, setAreaFiltroTextos] = useState('');
    const [areaFiltroActividades, setAreaFiltroActividades] = useState('');

    // Datos
    const [actividades, setActividades] = useState([]);
    const [combos, setCombos] = useState([]);
    const [textos, setTextos] = useState([]);
    const [botones, setBotones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // success | error

    // Formularios
    const [nuevaActividad, setNuevaActividad] = useState({ area: 'centro', nombre: '' });
    const [nuevoCombo, setNuevoCombo] = useState({ area: 'sst', actividad: '', nombre_campo: '' });
    const [nuevoTexto, setNuevoTexto] = useState({ area: 'sst', actividad: '', nombre_campo: '', placeholder: '', es_obligatorio: false });
    const [nuevoBoton, setNuevoBoton] = useState({ area: 'sst', actividad: '', nombre_campo: '' });
    const [opcionBoton, setOpcionBoton] = useState({ campo_id: '', opcion: '', color: '#5470c6' });
    const [opcionCombo, setOpcionCombo] = useState({ campo_id: '', opcion: '' });

    // Modal de confirmación (para evitar problemas con window.confirm)
    const [modalConfirm, setModalConfirm] = useState({ visible: false, tipo: '', id: null, nombre: '', extra: null });
    const [eliminando, setEliminando] = useState(false);

    // ---------- Helpers ----------
    const mostrarMensaje = (texto, tipo = 'success') => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    };

    // ---------- Cargar datos ----------
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/actividades/configuracion');
            if (res.data.success) {
                setActividades(res.data.actividades || []);
                setCombos(res.data.campos?.combos || []);
                setTextos(res.data.campos?.textos || []);
                setBotones(res.data.campos?.botones || []);
            } else {
                mostrarMensaje(res.data.error || 'Error cargando datos', 'error');
            }
        } catch (err) {
            console.error('Error cargando datos:', err);
            mostrarMensaje(err.response?.data?.error || 'Error de conexión con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ---------- Persistencia del filtro ----------
    useEffect(() => {
        localStorage.setItem('admin_filtro_tipo', filtroTipo);
    }, [filtroTipo]);

    // ---------- Handlers de creación ----------
    const crearActividad = async (e) => {
        e.preventDefault();
        if (!nuevaActividad.nombre.trim()) {
            mostrarMensaje('El nombre de la actividad es requerido', 'error');
            return;
        }
        try {
            const res = await api.post('/api/actividades/', nuevaActividad);
            if (res.data.success) {
                mostrarMensaje(res.data.message || 'Actividad creada correctamente');
                setActividades([...actividades, res.data.actividad]);
                setNuevaActividad({ area: 'centro', nombre: '' });
            } else {
                mostrarMensaje(res.data.error || 'Error creando actividad', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarMensaje(err.response?.data?.error || 'Error creando actividad', 'error');
        }
    };

    const crearCampo = async (tipo) => {
        let payload;
        if (tipo === 'combo') {
            if (!nuevoCombo.actividad || !nuevoCombo.nombre_campo) {
                mostrarMensaje('Actividad y nombre del campo son requeridos', 'error');
                return;
            }
            payload = { ...nuevoCombo, tipo: 'combo' };
        } else if (tipo === 'texto') {
            if (!nuevoTexto.actividad || !nuevoTexto.nombre_campo) {
                mostrarMensaje('Actividad y nombre del campo son requeridos', 'error');
                return;
            }
            payload = { ...nuevoTexto, tipo: 'texto', es_obligatorio: nuevoTexto.es_obligatorio ? 1 : 0 };
        } else if (tipo === 'grupo_botones') {
            if (!nuevoBoton.actividad || !nuevoBoton.nombre_campo) {
                mostrarMensaje('Actividad y nombre del campo son requeridos', 'error');
                return;
            }
            payload = { ...nuevoBoton, tipo: 'grupo_botones' };
        }

        try {
            const res = await api.post('/api/actividades/campos', payload);
            if (res.data.success) {
                mostrarMensaje(res.data.message || 'Campo creado correctamente');
                // Recargar datos para obtener el campo con ID real y opciones
                await cargarDatos();
                // Limpiar formulario
                if (tipo === 'combo') setNuevoCombo({ area: 'sst', actividad: '', nombre_campo: '' });
                else if (tipo === 'texto') setNuevoTexto({ area: 'sst', actividad: '', nombre_campo: '', placeholder: '', es_obligatorio: false });
                else if (tipo === 'grupo_botones') setNuevoBoton({ area: 'sst', actividad: '', nombre_campo: '' });
            } else {
                mostrarMensaje(res.data.error || 'Error creando campo', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarMensaje(err.response?.data?.error || 'Error creando campo', 'error');
        }
    };

    const agregarOpcion = async () => {
        if (!opcionCombo.campo_id || !opcionCombo.opcion.trim()) {
            mostrarMensaje('ID del campo y opción son requeridos', 'error');
            return;
        }
        try {
            const res = await api.post('/api/actividades/combos/opciones', {
                campo_id: parseInt(opcionCombo.campo_id),
                opcion: opcionCombo.opcion.trim()
            });
            if (res.data.success) {
                mostrarMensaje(res.data.message || 'Opción agregada');
                setOpcionCombo({ campo_id: '', opcion: '' });
                await cargarDatos();
            } else {
                mostrarMensaje(res.data.error || 'Error agregando opción', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarMensaje(err.response?.data?.error || 'Error agregando opción', 'error');
        }
    };

    const agregarOpcionBoton = async () => {
        if (!opcionBoton.campo_id || !opcionBoton.opcion.trim()) {
            mostrarMensaje('ID del grupo y opción son requeridos', 'error');
            return;
        }
        try {
            const res = await api.post('/api/actividades/botones/opciones', {
                campo_id: parseInt(opcionBoton.campo_id),
                opcion: opcionBoton.opcion.trim(),
                color: opcionBoton.color
            });
            if (res.data.success) {
                mostrarMensaje(res.data.message || 'Opción agregada');
                setOpcionBoton({ campo_id: '', opcion: '', color: '#5470c6' });
                await cargarDatos();
            } else {
                mostrarMensaje(res.data.error || 'Error agregando opción', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarMensaje(err.response?.data?.error || 'Error agregando opción', 'error');
        }
    };

    // ---------- Handlers de eliminación (con modal) ----------
    const abrirConfirmacion = (tipo, id, nombre, extra = null) => {
        setModalConfirm({ visible: true, tipo, id, nombre, extra });
    };

    const cerrarConfirmacion = () => {
        setModalConfirm({ visible: false, tipo: '', id: null, nombre: '', extra: null });
    };

    const ejecutarEliminacion = async () => {
        if (!modalConfirm.visible) return;
        setEliminando(true);

        try {
            let res;
            if (modalConfirm.tipo === 'actividad') {
                res = await api.delete(`/api/actividades/${modalConfirm.id}`);
                if (res.data.success) {
                    setActividades(actividades.filter(a => a.id !== modalConfirm.id));
                    mostrarMensaje(res.data.message || 'Actividad eliminada');
                }
            } else if (modalConfirm.tipo === 'campo') {
                res = await api.delete(`/api/actividades/campos/${modalConfirm.id}`);
                if (res.data.success) {
                    mostrarMensaje(res.data.message || 'Campo eliminado');
                    await cargarDatos();
                }
            } else if (modalConfirm.tipo === 'opcion_combo') {
                res = await api.delete('/api/actividades/combos/opciones', {
                    data: { campo_id: modalConfirm.id, opcion: modalConfirm.extra }
                });
                if (res.data.success) {
                    mostrarMensaje(res.data.message || 'Opción eliminada');
                    await cargarDatos();
                }
            } else if (modalConfirm.tipo === 'opcion_boton') {
                res = await api.delete('/api/actividades/botones/opciones', {
                    data: { campo_id: modalConfirm.id, opcion: modalConfirm.extra }
                });
                if (res.data.success) {
                    mostrarMensaje(res.data.message || 'Opción eliminada');
                    await cargarDatos();
                }
            }

            if (!res.data.success) {
                mostrarMensaje(res.data.error || 'Error en la operación', 'error');
            }
        } catch (err) {
            console.error(err);
            mostrarMensaje(err.response?.data?.error || 'Error de conexión', 'error');
        } finally {
            setEliminando(false);
            cerrarConfirmacion();
        }
    };

    // ---------- Filtrados ----------
    const actividadesFiltradas = areaFiltroActividades
        ? actividades.filter(a => a.area === areaFiltroActividades)
        : actividades;

    const combosFiltrados = areaFiltroCombos
        ? combos.filter(c => c.area === areaFiltroCombos)
        : combos;

    const textosFiltrados = areaFiltroTextos
        ? textos.filter(t => t.area === areaFiltroTextos)
        : textos;

    const botonesFiltrados = areaFiltroBotones
        ? botones.filter(b => b.area === areaFiltroBotones)
        : botones;

    // ---------- Render helpers ----------
    const getAreaBadgeClass = (area) => area === 'centro' ? 'centro' : 'sst';
    const getAreaLabel = (area) => area === 'centro' ? 'Centro Médico' : 'SST';

    if (loading) return (
        <Layout user={user} activeSection="actividades" onLogout={handleLogout}>
            <div className="content-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px', display: 'block' }}></i>
                    Cargando datos...
                </div>
            </div>
        </Layout>
    );

    return (
        <Layout user={user} activeSection="actividades" onLogout={handleLogout}>
            <div className="content-area">
                {/* Mensajes de alerta */}
                {mensaje.texto && (
                    <div className={`alerta-mensaje alerta-${mensaje.tipo}`} style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        backgroundColor: mensaje.tipo === 'error' ? '#fee2e2' : '#d1fae5',
                        color: mensaje.tipo === 'error' ? '#991b1b' : '#065f46',
                        border: `1px solid ${mensaje.tipo === 'error' ? '#fca5a5' : '#6ee7b7'}`
                    }}>
                        <i className={`fas fa-${mensaje.tipo === 'error' ? 'exclamation-circle' : 'check-circle'}`}></i>
                        {' '}{mensaje.texto}
                    </div>
                )}

                {/* Creation Type Selector */}
                <div className="creation-type">
                    <div className="creation-type-label">Creación de:</div>
                    <select
                        id="filtroTipo"
                        name="tipo_creacion"
                        className="creation-type-select"
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                        <option value="">Seleccione una opción</option>
                        <option value="combo">Combo box</option>
                        <option value="texto">Cuadro de texto</option>
                        <option value="grupo_botones">Grupo de botones (múltiple)</option>
                        <option value="actividad">Actividades</option>
                    </select>
                </div>

                {/* PANEL: GRUPOS DE BOTONES */}
                {filtroTipo === 'grupo_botones' && (
                    <div id="panel-botones" className="panel-actividades activo">
                        <div className="two-columns">
                            {/* Left Card - Crear */}
                            <div className="card">
                                <div className="card-header purple">
                                    <i className="fas fa-toggle-on"></i>
                                    Administrar Grupos de Botones
                                </div>
                                <div className="card-body">
                                    <div className="form-subtitle">Selección múltiple limitada a 7 opciones máximo</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Crear Nuevo Grupo de Botones</h3>
                                    <div className="form-group">
                                        <label className="form-label">Área</label>
                                        <select
                                            className="form-select"
                                            value={nuevoBoton.area}
                                            onChange={(e) => setNuevoBoton({ ...nuevoBoton, area: e.target.value })}
                                        >
                                            <option value="sst">🛡️ SST</option>
                                            <option value="centro">🏥 Centro Médico</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Actividad Específica</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Capacitación SST"
                                            value={nuevoBoton.actividad}
                                            onChange={(e) => setNuevoBoton({ ...nuevoBoton, actividad: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nombre del Grupo</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Temas de interés"
                                            value={nuevoBoton.nombre_campo}
                                            onChange={(e) => setNuevoBoton({ ...nuevoBoton, nombre_campo: e.target.value })}
                                        />
                                    </div>
                                    <button type="button" onClick={() => crearCampo('grupo_botones')} className="btn-primary btn-purple">
                                        <i className="fas fa-plus"></i> Crear Grupo de Botones
                                    </button>
                                    <div className="options-section">
                                        <div className="options-title">Agregar Opciones al Grupo (Máx. 7)</div>
                                        <div className="options-row">
                                            <select
                                                className="form-select"
                                                style={{ flex: '0 0 140px' }}
                                                value={opcionBoton.campo_id}
                                                onChange={(e) => setOpcionBoton({ ...opcionBoton, campo_id: e.target.value })}
                                            >
                                                <option value="">Seleccionar grupo...</option>
                                                {botones.map(b => (
                                                    <option key={b.id} value={b.id}>#{b.id} - {b.nombre_campo}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Texto de la opción"
                                                value={opcionBoton.opcion}
                                                onChange={(e) => setOpcionBoton({ ...opcionBoton, opcion: e.target.value })}
                                            />
                                            <input
                                                type="color"
                                                value={opcionBoton.color}
                                                title="Color del botón"
                                                style={{ flex: '0 0 40px', padding: '4px', cursor: 'pointer' }}
                                                onChange={(e) => setOpcionBoton({ ...opcionBoton, color: e.target.value })}
                                            />
                                            <button type="button" onClick={agregarOpcionBoton} className="btn-opcion" style={{ width: 'auto', margin: 0 }}>
                                                <i className="fas fa-plus"></i>
                                            </button>
                                        </div>
                                        <div className="hint-text">Máximo 7 opciones por grupo. Las opciones se mostrarán como botones seleccionables.</div>
                                    </div>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className="card">
                                <div className="card-header dark">
                                    <i className="fas fa-layer-group"></i>
                                    Grupos de Botones Configurados
                                </div>
                                <div className="card-body">
                                    <div className="filter-section">
                                        <div className="filter-section-label">Filtrar por Área</div>
                                        <select
                                            className="form-select"
                                            value={areaFiltroBotones}
                                            onChange={(e) => setAreaFiltroBotones(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className="table-container">
                                        <table id="tablaBotones">
                                            <thead>
                                                <tr><th>ID</th><th>Área / Info</th><th>Opciones (máx. 7)</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {botonesFiltrados.map((boton) => (
                                                    <tr key={boton.id} data-area={boton.area}>
                                                        <td><span className="combo-id">#{boton.id}</span></td>
                                                        <td>
                                                            <div className="combo-info">
                                                                <span className={`area-badge ${getAreaBadgeClass(boton.area)}`}>{getAreaLabel(boton.area)}</span>
                                                                <span className="combo-nombre">{boton.nombre_campo}</span>
                                                                <span className="combo-actividad">{boton.actividad}</span>
                                                            </div>
                                                        </td>
                                                        <td className="opciones-celda">
                                                            <div className="botones-preview">
                                                                {boton.opciones.map((op, idx) => (
                                                                    <span key={idx} className="boton-tag" style={{ backgroundColor: op.color + '20', color: op.color, border: `1px solid ${op.color}` }}>
                                                                        {op.texto}
                                                                        <button type="button" onClick={() => abrirConfirmacion('opcion_boton', boton.id, op.texto, op.texto)} className="btn-eliminar-opcion" title="Eliminar">×</button>
                                                                    </span>
                                                                ))}
                                                                {boton.opciones.length >= 7 && (
                                                                    <span className="limite-alcanzado">(Límite: 7)</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => abrirConfirmacion('campo', boton.id, boton.nombre_campo)} className="btn-eliminar-combo">Eliminar Grupo</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {botonesFiltrados.length === 0 && (
                                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No hay grupos de botones configurados</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PANEL: ACTIVIDADES PRINCIPALES */}
                {filtroTipo === 'actividad' && (
                    <div id="panel-actividades" className="panel-actividades activo">
                        <div className="two-columns">
                            {/* Left Card - Crear */}
                            <div className="card">
                                <div className="card-header blue">
                                    <i className="fas fa-clipboard-list"></i>
                                    Administrar Actividades
                                </div>
                                <div className="card-body">
                                    <form onSubmit={crearActividad}>
                                        <div className="form-group">
                                            <label className="form-label">Área</label>
                                            <select
                                                className="form-select"
                                                value={nuevaActividad.area}
                                                onChange={(e) => setNuevaActividad({ ...nuevaActividad, area: e.target.value })}
                                                required
                                            >
                                                <option value="centro">🏥 Centro Médico</option>
                                                <option value="sst">🛡️ Seguridad y Salud en el Trabajo</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Nueva actividad</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Nombre de la actividad"
                                                value={nuevaActividad.nombre}
                                                onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn-primary btn-blue">
                                            <i className="fas fa-plus"></i> Agregar actividad
                                        </button>
                                    </form>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className="card">
                                <div className="card-header dark">
                                    <i className="fas fa-list"></i>
                                    Actividades Registradas
                                </div>
                                <div className="card-body">
                                    <div className="filter-section">
                                        <div className="filter-section-label">Filtrar por Área</div>
                                        <select
                                            className="form-select"
                                            value={areaFiltroActividades}
                                            onChange={(e) => setAreaFiltroActividades(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr><th>Área</th><th>Actividad</th><th>Acción</th></tr>
                                            </thead>
                                            <tbody>
                                                {actividadesFiltradas.map((act) => (
                                                    <tr key={act.id} data-area={act.area}>
                                                        <td><span className={`area-badge ${getAreaBadgeClass(act.area)}`}>{getAreaLabel(act.area)}</span></td>
                                                        <td>{act.nombre}</td>
                                                        <td><button type="button" className="btn-delete" onClick={() => abrirConfirmacion('actividad', act.id, act.nombre)}>🗑 Eliminar</button></td>
                                                    </tr>
                                                ))}
                                                {actividadesFiltradas.length === 0 && (
                                                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No hay actividades registradas</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PANEL: COMBOS */}
                {filtroTipo === 'combo' && (
                    <div id="panel-combos" className="panel-actividades activo">
                        <div className="two-columns">
                            {/* Left Card - Crear */}
                            <div className="card">
                                <div className="card-header purple">
                                    <i className="fas fa-list-ul"></i>
                                    Administrar Combos
                                </div>
                                <div className="card-body">
                                    <div className="form-subtitle">Crear combos desplegables para el formulario</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Crear Nuevo Combo</h3>
                                    <div className="form-group">
                                        <label className="form-label">Área</label>
                                        <select
                                            className="form-select"
                                            value={nuevoCombo.area}
                                            onChange={(e) => setNuevoCombo({ ...nuevoCombo, area: e.target.value })}
                                        >
                                            <option value="sst">🛡️ SST</option>
                                            <option value="centro">🏥 Centro Médico</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Actividad Específica</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Inducción Nuevos Sergistas"
                                            value={nuevoCombo.actividad}
                                            onChange={(e) => setNuevoCombo({ ...nuevoCombo, actividad: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nombre del Campo</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Tipo de Inducción"
                                            value={nuevoCombo.nombre_campo}
                                            onChange={(e) => setNuevoCombo({ ...nuevoCombo, nombre_campo: e.target.value })}
                                        />
                                    </div>
                                    <button type="button" onClick={() => crearCampo('combo')} className="btn-primary btn-purple">
                                        <i className="fas fa-plus"></i> Crear Combo
                                    </button>
                                    <div className="options-section">
                                        <div className="options-title">Agregar Opciones a Combo</div>
                                        <div className="options-row">
                                            <select
                                                className="form-select"
                                                style={{ flex: '0 0 140px' }}
                                                value={opcionCombo.campo_id}
                                                onChange={(e) => setOpcionCombo({ ...opcionCombo, campo_id: e.target.value })}
                                            >
                                                <option value="">Seleccionar combo...</option>
                                                {combos.map(c => (
                                                    <option key={c.id} value={c.id}>#{c.id} - {c.nombre_campo}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Texto opción"
                                                value={opcionCombo.opcion}
                                                onChange={(e) => setOpcionCombo({ ...opcionCombo, opcion: e.target.value })}
                                            />
                                            <button type="button" onClick={agregarOpcion} className="btn-opcion" style={{ width: 'auto', margin: 0 }}>
                                                <i className="fas fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className="card">
                                <div className="card-header dark">
                                    <i className="fas fa-layer-group"></i>
                                    Combos Configurados
                                </div>
                                <div className="card-body">
                                    <div className="filter-section">
                                        <div className="filter-section-label">Filtrar por Área</div>
                                        <select
                                            className="form-select"
                                            value={areaFiltroCombos}
                                            onChange={(e) => setAreaFiltroCombos(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className="table-container">
                                        <table id="tablaCombos">
                                            <thead>
                                                <tr><th>ID</th><th>Área / Info</th><th>Opciones</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {combosFiltrados.map((combo) => (
                                                    <tr key={combo.id} data-area={combo.area}>
                                                        <td><span className="combo-id">#{combo.id}</span></td>
                                                        <td>
                                                            <div className="combo-info">
                                                                <span className={`area-badge ${getAreaBadgeClass(combo.area)}`}>{getAreaLabel(combo.area)}</span>
                                                                <span className="combo-nombre">{combo.nombre_campo}</span>
                                                                <span className="combo-actividad">{combo.actividad}</span>
                                                            </div>
                                                        </td>
                                                        <td className="opciones-celda">
                                                            <div className="opciones-lista">
                                                                {combo.opciones.map((op, idx) => (
                                                                    <span key={idx} className="opcion-tag">
                                                                        {op}
                                                                        <button type="button" onClick={() => abrirConfirmacion('opcion_combo', combo.id, combo.nombre_campo, op)} className="btn-eliminar-opcion" title="Eliminar">×</button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => abrirConfirmacion('campo', combo.id, combo.nombre_campo)} className="btn-eliminar-combo">Eliminar Combo</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {combosFiltrados.length === 0 && (
                                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No hay combos configurados</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PANEL: TEXTOS */}
                {filtroTipo === 'texto' && (
                    <div id="panel-textos" className="panel-actividades activo">
                        <div className="two-columns">
                            {/* Left Card - Crear */}
                            <div className="card">
                                <div className="card-header green">
                                    <i className="fas fa-font"></i>
                                    Administrar Campos de Texto
                                </div>
                                <div className="card-body">
                                    <div className="form-subtitle">Crear campos de texto para el formulario</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Crear Nuevo Campo de Texto</h3>
                                    <div className="form-group">
                                        <label className="form-label">Área</label>
                                        <select
                                            className="form-select"
                                            value={nuevoTexto.area}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, area: e.target.value })}
                                        >
                                            <option value="sst">🛡️ SST</option>
                                            <option value="centro">🏥 Centro Médico</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Actividad Específica</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Consulta Médica"
                                            value={nuevoTexto.actividad}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, actividad: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nombre del Campo</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Motivo de consulta"
                                            value={nuevoTexto.nombre_campo}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, nombre_campo: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Placeholder (ayuda)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Describa síntomas..."
                                            value={nuevoTexto.placeholder}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, placeholder: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group checkbox-row">
                                        <input
                                            type="checkbox"
                                            id="obligatorioTexto"
                                            checked={nuevoTexto.es_obligatorio}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, es_obligatorio: e.target.checked })}
                                        />
                                        <label htmlFor="obligatorioTexto" style={{ margin: 0, cursor: 'pointer' }}>Campo obligatorio</label>
                                    </div>
                                    <button type="button" onClick={() => crearCampo('texto')} className="btn-primary btn-green">
                                        <i className="fas fa-plus"></i> Crear Campo de Texto
                                    </button>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className="card">
                                <div className="card-header dark">
                                    <i className="fas fa-layer-group"></i>
                                    Campos de Texto Configurados
                                </div>
                                <div className="card-body">
                                    <div className="filter-section">
                                        <div className="filter-section-label">Filtrar por Área</div>
                                        <select
                                            className="form-select"
                                            value={areaFiltroTextos}
                                            onChange={(e) => setAreaFiltroTextos(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className="table-container">
                                        <table id="tablaTextos">
                                            <thead>
                                                <tr><th>ID</th><th>Área / Info</th><th>Placeholder</th><th>Obligatorio</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {textosFiltrados.map((texto) => (
                                                    <tr key={texto.id} data-area={texto.area}>
                                                        <td><span className="combo-id">#{texto.id}</span></td>
                                                        <td>
                                                            <div className="combo-info">
                                                                <span className={`area-badge ${getAreaBadgeClass(texto.area)}`}>{getAreaLabel(texto.area)}</span>
                                                                <span className="combo-nombre">{texto.nombre_campo}</span>
                                                                <span className="combo-actividad">{texto.actividad}</span>
                                                            </div>
                                                        </td>
                                                        <td><code className="placeholder-tag">{texto.placeholder || 'Sin placeholder'}</code></td>
                                                        <td>
                                                            {texto.es_obligatorio ? (
                                                                <span className="badge-obligatorio">SÍ</span>
                                                            ) : (
                                                                <span className="badge-opcional">NO</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => abrirConfirmacion('campo', texto.id, texto.nombre_campo)} className="btn-eliminar-combo">Eliminar</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {textosFiltrados.length === 0 && (
                                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No hay campos de texto configurados</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mensaje cuando no hay filtro seleccionado */}
                {!filtroTipo && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        <i className="fas fa-hand-pointer" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
                        <h3 style={{ color: '#64748b', marginBottom: '8px' }}>Seleccione una opción</h3>
                        <p>Seleccione el tipo de elemento que desea crear desde el selector superior.</p>
                    </div>
                )}
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            {modalConfirm.visible && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '420px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ fontSize: '40px', color: '#ef4444' }}></i>
                        </div>
                        <h3 style={{ textAlign: 'center', marginBottom: '8px', color: '#1e293b' }}>
                            ¿Eliminar {modalConfirm.tipo === 'actividad' ? 'actividad' : modalConfirm.tipo === 'campo' ? 'campo' : 'opción'}?
                        </h3>
                        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '20px' }}>
                            {modalConfirm.tipo === 'opcion_combo' || modalConfirm.tipo === 'opcion_boton'
                                ? `¿Eliminar la opción "${modalConfirm.extra}" de "${modalConfirm.nombre}"?`
                                : `¿Eliminar "${modalConfirm.nombre}"?`
                            }
                            <br /><strong style={{ color: '#ef4444' }}>Esta acción no se puede deshacer.</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={cerrarConfirmacion}
                                disabled={eliminando}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={ejecutarEliminacion}
                                disabled={eliminando}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-label">Descargar Excel</span>
                    <button onClick={() => window.open('/api/reportes/descargar/estudiantes', '_blank')} className="footer-btn footer-btn-green">
                        <i className="fas fa-download"></i> Estudiantes
                    </button>
                    <button onClick={() => window.open('/api/reportes/descargar/personal_universidad', '_blank')} className="footer-btn footer-btn-blue">
                        <i className="fas fa-download"></i> Funcionarios
                    </button>
                    <button onClick={() => window.open('/api/reportes/descargar/registros', '_blank')} className="footer-btn footer-btn-purple">
                        <i className="fas fa-download"></i> Registros
                    </button>
                </div>
                <div className="footer-right">
                    <i className="fas fa-shield-alt"></i>
                    <span>Sistema seguro</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span className="version">v1.0.0</span>
                </div>
            </footer>
        </Layout>
    );
};

export default Actividades;