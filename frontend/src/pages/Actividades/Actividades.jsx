import React, { useState, useEffect } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import Layout from '../../components/Layout/Layout.jsx';
import api from '../../api/axiosConfig.js';
import styles from './Actividades.module.css';

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
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

    // Formularios
    const [nuevaActividad, setNuevaActividad] = useState({ area: 'centro', nombre: '' });
    const [nuevoCombo, setNuevoCombo] = useState({ area: 'sst', actividad: '', nombre_campo: '' });
    const [nuevoTexto, setNuevoTexto] = useState({ area: 'sst', actividad: '', nombre_campo: '', placeholder: '', es_obligatorio: false });
    const [nuevoBoton, setNuevoBoton] = useState({ area: 'sst', actividad: '', nombre_campo: '' });
    const [opcionBoton, setOpcionBoton] = useState({ campo_id: '', opcion: '', color: '#5470c6' });
    const [opcionCombo, setOpcionCombo] = useState({ campo_id: '', opcion: '' });

    // Modal de confirmación
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
                await cargarDatos();
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

    // ---------- Handlers de eliminación ----------
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
    const getAreaBadgeClass = (area) => area === 'centro' ? styles.areaBadgeCentro : styles.areaBadgeSst;
    const getAreaLabel = (area) => area === 'centro' ? 'Centro Médico' : 'SST';

    if (loading) return (
        <Layout user={user} activeSection="actividades" onLogout={handleLogout}>
            <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Cargando datos...</span>
            </div>
        </Layout>
    );

    return (
        <Layout user={user} activeSection="actividades" onLogout={handleLogout}>
            <div className={styles.contentArea}>
                {/* Mensajes de alerta */}
                {mensaje.texto && (
                    <div className={`${styles.alertaMensaje} ${mensaje.tipo === 'error' ? styles.alertaError : styles.alertaSuccess}`}>
                        <i className={`fas fa-${mensaje.tipo === 'error' ? 'exclamation-circle' : 'check-circle'}`}></i>
                        <span>{mensaje.texto}</span>
                    </div>
                )}

                {/* Creation Type Selector */}
                <div className={styles.creationType}>
                    <div className={styles.creationTypeLabel}>Creación de:</div>
                    <select
                        id="filtroTipo"
                        name="tipo_creacion"
                        className={styles.creationTypeSelect}
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
                    <div id="panel-botones" className={styles.panelActividadesActivo}>
                        <div className={styles.twoColumns}>
                            {/* Left Card - Crear */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderPurple}`}>
                                    <i className="fas fa-toggle-on"></i>
                                    Administrar Grupos de Botones
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.formSubtitle}>Selección múltiple limitada a 7 opciones máximo</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Crear Nuevo Grupo de Botones</h3>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Área</label>
                                        <select
                                            className={styles.formSelect}
                                            value={nuevoBoton.area}
                                            onChange={(e) => setNuevoBoton({ ...nuevoBoton, area: e.target.value })}
                                        >
                                            <option value="sst">🛡️ SST</option>
                                            <option value="centro">🏥 Centro Médico</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Actividad Específica</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Capacitación SST"
                                            value={nuevoBoton.actividad}
                                            onChange={(e) => setNuevoBoton({ ...nuevoBoton, actividad: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Nombre del Grupo</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Temas de interés"
                                            value={nuevoBoton.nombre_campo}
                                            onChange={(e) => setNuevoBoton({ ...nuevoBoton, nombre_campo: e.target.value })}
                                        />
                                    </div>
                                    <button type="button" onClick={() => crearCampo('grupo_botones')} className={`${styles.btnPrimary} ${styles.btnPurple}`}>
                                        <i className="fas fa-plus"></i> Crear Grupo de Botones
                                    </button>
                                    <div className={styles.optionsSection}>
                                        <div className={styles.optionsTitle}>Agregar Opciones al Grupo (Máx. 7)</div>
                                        <div className={styles.optionsRow}>
                                            <select
                                                className={styles.formSelect}
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
                                                className={styles.formInput}
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
                                            <button type="button" onClick={agregarOpcionBoton} className={styles.btnOpcion} style={{ width: 'auto', margin: 0 }}>
                                                <i className="fas fa-plus"></i>
                                            </button>
                                        </div>
                                        <div className={styles.hintText}>Máximo 7 opciones por grupo. Las opciones se mostrarán como botones seleccionables.</div>
                                    </div>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderDark}`}>
                                    <i className="fas fa-layer-group"></i>
                                    Grupos de Botones Configurados
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.filterSection}>
                                        <div className={styles.filterSectionLabel}>Filtrar por Área</div>
                                        <select
                                            className={styles.formSelect}
                                            value={areaFiltroBotones}
                                            onChange={(e) => setAreaFiltroBotones(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr><th>ID</th><th>Área / Info</th><th>Opciones (máx. 7)</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {botonesFiltrados.map((boton) => (
                                                    <tr key={boton.id} data-area={boton.area}>
                                                        <td><span className={styles.comboId}>#{boton.id}</span></td>
                                                        <td>
                                                            <div className={styles.comboInfo}>
                                                                <span className={`${styles.areaBadge} ${getAreaBadgeClass(boton.area)}`}>{getAreaLabel(boton.area)}</span>
                                                                <span className={styles.comboNombre}>{boton.nombre_campo}</span>
                                                                <span className={styles.comboActividad}>{boton.actividad}</span>
                                                            </div>
                                                        </td>
                                                        <td className={styles.opcionesCelda}>
                                                            <div className={styles.botonesPreview}>
                                                                {boton.opciones.map((op, idx) => (
                                                                    <span key={idx} className={styles.botonTag} style={{ backgroundColor: op.color + '20', color: op.color, border: `1px solid ${op.color}` }}>
                                                                        {op.texto}
                                                                        <button type="button" onClick={() => abrirConfirmacion('opcion_boton', boton.id, op.texto, op.texto)} className={styles.btnEliminarOpcion} title="Eliminar">×</button>
                                                                    </span>
                                                                ))}
                                                                {boton.opciones.length >= 7 && (
                                                                    <span className={styles.limiteAlcanzado}>(Límite: 7)</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => abrirConfirmacion('campo', boton.id, boton.nombre_campo)} className={styles.btnEliminarCombo}>Eliminar Grupo</button>
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
                    <div id="panel-actividades" className={styles.panelActividadesActivo}>
                        <div className={styles.twoColumns}>
                            {/* Left Card - Crear */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderBlue}`}>
                                    <i className="fas fa-clipboard-list"></i>
                                    Administrar Actividades
                                </div>
                                <div className={styles.cardBody}>
                                    <form onSubmit={crearActividad}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Área</label>
                                            <select
                                                className={styles.formSelect}
                                                value={nuevaActividad.area}
                                                onChange={(e) => setNuevaActividad({ ...nuevaActividad, area: e.target.value })}
                                                required
                                            >
                                                <option value="centro">🏥 Centro Médico</option>
                                                <option value="sst">🛡️ Seguridad y Salud en el Trabajo</option>
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Nueva actividad</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                placeholder="Nombre de la actividad"
                                                value={nuevaActividad.nombre}
                                                onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className={`${styles.btnPrimary} ${styles.btnBlue}`}>
                                            <i className="fas fa-plus"></i> Agregar actividad
                                        </button>
                                    </form>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderDark}`}>
                                    <i className="fas fa-list"></i>
                                    Actividades Registradas
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.filterSection}>
                                        <div className={styles.filterSectionLabel}>Filtrar por Área</div>
                                        <select
                                            className={styles.formSelect}
                                            value={areaFiltroActividades}
                                            onChange={(e) => setAreaFiltroActividades(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr><th>Área</th><th>Actividad</th><th>Acción</th></tr>
                                            </thead>
                                            <tbody>
                                                {actividadesFiltradas.map((act) => (
                                                    <tr key={act.id} data-area={act.area}>
                                                        <td><span className={`${styles.areaBadge} ${getAreaBadgeClass(act.area)}`}>{getAreaLabel(act.area)}</span></td>
                                                        <td>{act.nombre}</td>
                                                        <td><button type="button" className={styles.btnDelete} onClick={() => abrirConfirmacion('actividad', act.id, act.nombre)}>🗑 Eliminar</button></td>
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
                    <div id="panel-combos" className={styles.panelActividadesActivo}>
                        <div className={styles.twoColumns}>
                            {/* Left Card - Crear */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderPurple}`}>
                                    <i className="fas fa-list-ul"></i>
                                    Administrar Combos
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.formSubtitle}>Crear combos desplegables para el formulario</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Crear Nuevo Combo</h3>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Área</label>
                                        <select
                                            className={styles.formSelect}
                                            value={nuevoCombo.area}
                                            onChange={(e) => setNuevoCombo({ ...nuevoCombo, area: e.target.value })}
                                        >
                                            <option value="sst">🛡️ SST</option>
                                            <option value="centro">🏥 Centro Médico</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Actividad Específica</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Inducción Nuevos Sergistas"
                                            value={nuevoCombo.actividad}
                                            onChange={(e) => setNuevoCombo({ ...nuevoCombo, actividad: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Nombre del Campo</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Tipo de Inducción"
                                            value={nuevoCombo.nombre_campo}
                                            onChange={(e) => setNuevoCombo({ ...nuevoCombo, nombre_campo: e.target.value })}
                                        />
                                    </div>
                                    <button type="button" onClick={() => crearCampo('combo')} className={`${styles.btnPrimary} ${styles.btnPurple}`}>
                                        <i className="fas fa-plus"></i> Crear Combo
                                    </button>
                                    <div className={styles.optionsSection}>
                                        <div className={styles.optionsTitle}>Agregar Opciones a Combo</div>
                                        <div className={styles.optionsRow}>
                                            <select
                                                className={styles.formSelect}
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
                                                className={styles.formInput}
                                                placeholder="Texto opción"
                                                value={opcionCombo.opcion}
                                                onChange={(e) => setOpcionCombo({ ...opcionCombo, opcion: e.target.value })}
                                            />
                                            <button type="button" onClick={agregarOpcion} className={styles.btnOpcion} style={{ width: 'auto', margin: 0 }}>
                                                <i className="fas fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderDark}`}>
                                    <i className="fas fa-layer-group"></i>
                                    Combos Configurados
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.filterSection}>
                                        <div className={styles.filterSectionLabel}>Filtrar por Área</div>
                                        <select
                                            className={styles.formSelect}
                                            value={areaFiltroCombos}
                                            onChange={(e) => setAreaFiltroCombos(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr><th>ID</th><th>Área / Info</th><th>Opciones</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {combosFiltrados.map((combo) => (
                                                    <tr key={combo.id} data-area={combo.area}>
                                                        <td><span className={styles.comboId}>#{combo.id}</span></td>
                                                        <td>
                                                            <div className={styles.comboInfo}>
                                                                <span className={`${styles.areaBadge} ${getAreaBadgeClass(combo.area)}`}>{getAreaLabel(combo.area)}</span>
                                                                <span className={styles.comboNombre}>{combo.nombre_campo}</span>
                                                                <span className={styles.comboActividad}>{combo.actividad}</span>
                                                            </div>
                                                        </td>
                                                        <td className={styles.opcionesCelda}>
                                                            <div className={styles.opcionesLista}>
                                                                {combo.opciones.map((op, idx) => (
                                                                    <span key={idx} className={styles.opcionTag}>
                                                                        {op}
                                                                        <button type="button" onClick={() => abrirConfirmacion('opcion_combo', combo.id, combo.nombre_campo, op)} className={styles.btnEliminarOpcion} title="Eliminar">×</button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => abrirConfirmacion('campo', combo.id, combo.nombre_campo)} className={styles.btnEliminarCombo}>Eliminar Combo</button>
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
                    <div id="panel-textos" className={styles.panelActividadesActivo}>
                        <div className={styles.twoColumns}>
                            {/* Left Card - Crear */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderGreen}`}>
                                    <i className="fas fa-font"></i>
                                    Administrar Campos de Texto
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.formSubtitle}>Crear campos de texto para el formulario</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Crear Nuevo Campo de Texto</h3>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Área</label>
                                        <select
                                            className={styles.formSelect}
                                            value={nuevoTexto.area}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, area: e.target.value })}
                                        >
                                            <option value="sst">🛡️ SST</option>
                                            <option value="centro">🏥 Centro Médico</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Actividad Específica</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Consulta Médica"
                                            value={nuevoTexto.actividad}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, actividad: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Nombre del Campo</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Motivo de consulta"
                                            value={nuevoTexto.nombre_campo}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, nombre_campo: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Placeholder (ayuda)</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Ej: Describa síntomas..."
                                            value={nuevoTexto.placeholder}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, placeholder: e.target.value })}
                                        />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.checkboxRow}`}>
                                        <input
                                            type="checkbox"
                                            id="obligatorioTexto"
                                            checked={nuevoTexto.es_obligatorio}
                                            onChange={(e) => setNuevoTexto({ ...nuevoTexto, es_obligatorio: e.target.checked })}
                                        />
                                        <label htmlFor="obligatorioTexto" style={{ margin: 0, cursor: 'pointer' }}>Campo obligatorio</label>
                                    </div>
                                    <button type="button" onClick={() => crearCampo('texto')} className={`${styles.btnPrimary} ${styles.btnGreen}`}>
                                        <i className="fas fa-plus"></i> Crear Campo de Texto
                                    </button>
                                </div>
                            </div>
                            {/* Right Card - Tabla */}
                            <div className={styles.card}>
                                <div className={`${styles.cardHeader} ${styles.cardHeaderDark}`}>
                                    <i className="fas fa-layer-group"></i>
                                    Campos de Texto Configurados
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.filterSection}>
                                        <div className={styles.filterSectionLabel}>Filtrar por Área</div>
                                        <select
                                            className={styles.formSelect}
                                            value={areaFiltroTextos}
                                            onChange={(e) => setAreaFiltroTextos(e.target.value)}
                                        >
                                            <option value="">Todas las áreas</option>
                                            <option value="centro">Centro Médico</option>
                                            <option value="sst">SST</option>
                                        </select>
                                    </div>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr><th>ID</th><th>Área / Info</th><th>Placeholder</th><th>Obligatorio</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {textosFiltrados.map((texto) => (
                                                    <tr key={texto.id} data-area={texto.area}>
                                                        <td><span className={styles.comboId}>#{texto.id}</span></td>
                                                        <td>
                                                            <div className={styles.comboInfo}>
                                                                <span className={`${styles.areaBadge} ${getAreaBadgeClass(texto.area)}`}>{getAreaLabel(texto.area)}</span>
                                                                <span className={styles.comboNombre}>{texto.nombre_campo}</span>
                                                                <span className={styles.comboActividad}>{texto.actividad}</span>
                                                            </div>
                                                        </td>
                                                        <td><code className={styles.placeholderTag}>{texto.placeholder || 'Sin placeholder'}</code></td>
                                                        <td>
                                                            {texto.es_obligatorio ? (
                                                                <span className={styles.badgeObligatorio}>SÍ</span>
                                                            ) : (
                                                                <span className={styles.badgeOpcional}>NO</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button type="button" onClick={() => abrirConfirmacion('campo', texto.id, texto.nombre_campo)} className={styles.btnEliminarCombo}>Eliminar</button>
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
                    <div className={styles.emptyState}>
                        <i className={`fas fa-hand-pointer ${styles.emptyStateIcon}`}></i>
                        <h3 className={styles.emptyStateTitle}>Seleccione una opción</h3>
                        <p>Seleccione el tipo de elemento que desea crear desde el selector superior.</p>
                    </div>
                )}
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            {modalConfirm.visible && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalIcon}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 className={styles.modalTitle}>
                            ¿Eliminar {modalConfirm.tipo === 'actividad' ? 'actividad' : modalConfirm.tipo === 'campo' ? 'campo' : 'opción'}?
                        </h3>
                        <p className={styles.modalText}>
                            {modalConfirm.tipo === 'opcion_combo' || modalConfirm.tipo === 'opcion_boton'
                                ? `¿Eliminar la opción "${modalConfirm.extra}" de "${modalConfirm.nombre}"?`
                                : `¿Eliminar "${modalConfirm.nombre}"?`
                            }
                            <br /><strong className={styles.modalWarning}>Esta acción no se puede deshacer.</strong>
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={cerrarConfirmacion}
                                disabled={eliminando}
                                className={styles.modalBtnCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={ejecutarEliminacion}
                                disabled={eliminando}
                                className={styles.modalBtnConfirm}
                            >
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerLeft}>
                    <span className={styles.footerLabel}>Descargar Excel</span>
                    <button onClick={() => window.open('/api/reportes/descargar/estudiantes', '_blank')} className={`${styles.footerBtn} ${styles.footerBtnGreen}`}>
                        <i className="fas fa-download"></i> Estudiantes
                    </button>
                    <button onClick={() => window.open('/api/reportes/descargar/personal_universidad', '_blank')} className={`${styles.footerBtn} ${styles.footerBtnBlue}`}>
                        <i className="fas fa-download"></i> Funcionarios
                    </button>
                    <button onClick={() => window.open('/api/reportes/descargar/registros', '_blank')} className={`${styles.footerBtn} ${styles.footerBtnPurple}`}>
                        <i className="fas fa-download"></i> Registros
                    </button>
                </div>
                <div className={styles.footerRight}>
                    <i className="fas fa-shield-alt"></i>
                    <span>Sistema seguro</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span className={styles.version}>v1.0.0</span>
                </div>
            </footer>
        </Layout>
    );
};

export default Actividades;