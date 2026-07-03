import React, { useState, useEffect } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import api from '../../api/axiosConfig';
import Layout from '../../components/Layout/Layout.jsx';
import './Configuracion.css';

const Configuracion = () => {
    const { user, handleLogout } = usePanel();

    // ---------- Estados ----------
    const [errores, setErrores] = useState([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalErrores, setTotalErrores] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // Modal de confirmación
    const [modalConfirm, setModalConfirm] = useState({
        visible: false,
        tabla: '',
        nombreTabla: ''
    });

    // QR
    const [qrTexto, setQrTexto] = useState('https://sistema-admin.com/registro');
    const [qrTamaño, setQrTamaño] = useState('400');
    const [qrImagen, setQrImagen] = useState(null);
    const [qrGenerando, setQrGenerando] = useState(false);

    // Upload imagen
    const [imagenPreview, setImagenPreview] = useState(null);
    const [imagenFile, setImagenFile] = useState(null);

    const ITEMS_POR_PAGINA = 10;

    // ---------- Cargar errores desde la API ----------
    const cargarErrores = async () => {
        setLoading(true);
        setMensaje(null);
        try {
            const response = await api.get(`/api/auth/errores?pagina=${paginaActual}&por_pagina=${ITEMS_POR_PAGINA}`);
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al cargar errores');
            }

            setErrores(data.errores || []);
            setTotalPaginas(data.total_paginas || 1);
            setTotalErrores(data.total_errores || 0);
        } catch (err) {
            console.error('Error cargando errores:', err);
            setMensaje({
                tipo: 'error',
                texto: err.response?.data?.error || err.message || 'Error al cargar errores del sistema'
            });
            setErrores([]);
            setTotalPaginas(1);
            setTotalErrores(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarErrores();
    }, [paginaActual]);

    // ---------- Modal de confirmación ----------
    const abrirConfirmacion = (tabla) => {
        const nombres = {
            estudiantes: 'ESTUDIANTES',
            personal_universidad: 'FUNCIONARIOS',
            registros: 'REGISTROS DEL FORMULARIO',
            auditoria_sistema: 'REGISTROS DE TABLA LOGS',
            errores_sistema: 'REGISTROS DE TABLA ERRORES'
        };
        setModalConfirm({
            visible: true,
            tabla: tabla,
            nombreTabla: nombres[tabla] || tabla
        });
    };

    const cerrarConfirmacion = () => {
        setModalConfirm({ visible: false, tabla: '', nombreTabla: '' });
    };

    // ---------- Limpieza de datos ----------
    const ejecutarEliminacion = async () => {
        const { tabla, nombreTabla } = modalConfirm;
        cerrarConfirmacion();
        setEliminando(true);
        setMensaje(null);

        try {
            console.log('📡 Enviando petición a /api/admin/tablas/eliminar con tabla:', tabla);
            const response = await api.post('/api/admin/tablas/eliminar', { tabla });
            console.log('📡 Respuesta:', response.data);
            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al eliminar datos');
            }

            setMensaje({
                tipo: 'success',
                texto: `✅ ${data.message || `Datos de ${nombreTabla} eliminados correctamente`}`
            });

            // Recargar errores si se limpió la tabla de errores
            if (tabla === 'errores_sistema') {
                setPaginaActual(1);
                await cargarErrores();
            }
        } catch (err) {
            console.error('❌ Error en eliminarTabla:', err);
            setMensaje({
                tipo: 'error',
                texto: err.response?.data?.error || err.message || '❌ Error al eliminar los datos'
            });
        } finally {
            setEliminando(false);
        }
    };

    // ---------- Generador de QR ----------
    const generarQR = async () => {
        if (!qrTexto.trim()) {
            setMensaje({ tipo: 'error', texto: 'Por favor ingresa un texto o URL' });
            return;
        }
        setQrGenerando(true);
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=${qrTamaño}x${qrTamaño}&data=${encodeURIComponent(qrTexto)}`;
            setQrImagen(url);
        } catch (err) {
            console.error(err);
            setMensaje({ tipo: 'error', texto: 'Error al generar el QR' });
        } finally {
            setQrGenerando(false);
        }
    };

    const descargarQR = () => {
        if (!qrImagen) {
            setMensaje({ tipo: 'error', texto: 'Primero genera el QR' });
            return;
        }
        const link = document.createElement('a');
        link.href = qrImagen;
        link.download = `qr_${qrTexto.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        link.click();
    };

    // ---------- Upload de imagen ----------
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) procesarImagen(files[0]);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) procesarImagen(file);
    };

    const procesarImagen = (file) => {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024;

        if (!tiposPermitidos.includes(file.type)) {
            setMensaje({ tipo: 'error', texto: 'Formato no permitido. Use JPG, PNG o GIF' });
            return;
        }
        if (file.size > maxSize) {
            setMensaje({ tipo: 'error', texto: 'El archivo excede 5MB' });
            return;
        }

        setImagenFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagenPreview(e.target.result);
        reader.readAsDataURL(file);
    };
   const subirImagen = async () => {
        if (!imagenFile) {
            setMensaje({ tipo: 'error', texto: 'Selecciona una imagen primero' });
            return;
        }
        setMensaje(null);
        try {
            const formData = new FormData();
            formData.append('imagen', imagenFile);
            formData.append('nombre_fijo', 'fondo-del-formulario');
            
            
            console.log('📡 Subiendo imagen a /api/upload/imagen...');
            const response = await api.post('/api/upload/imagen', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('📡 Respuesta:', response.data);
            
            setMensaje({ tipo: 'success', texto: '✅ Imagen subida correctamente como fondo-del-formulario' });
            setImagenPreview(null);
            setImagenFile(null);
        } catch (err) {
            console.error('❌ Error subiendo imagen:', err);
            console.error('❌ Error response:', err.response);
            setMensaje({
                tipo: 'error',
                texto: err.response?.data?.error || err.message || 'Error al subir la imagen'
            });
        }
    };

    // ---------- Helpers ----------
    const getBadgeTipo = (tipo) => {
        switch (tipo) {
            case 'Error': return 'badge-error';
            case 'Advertencia': return 'badge-warning';
            default: return 'badge-info';
        }
    };

    const getBadgeEstado = (estado) => {
        switch (estado) {
            case 'No resuelto': return { clase: 'badge-error', dot: 'red' };
            case 'En revisión': return { clase: 'badge-warning', dot: 'yellow' };
            default: return { clase: 'badge-success', dot: 'green' };
        }
    };

    // ---------- Paginación ----------
    const irPagina = (pagina) => {
        if (pagina < 1 || pagina > totalPaginas) return;
        setPaginaActual(pagina);
    };

    const generarRangoPaginas = () => {
        const paginas = [];
        for (let i = 1; i <= totalPaginas; i++) {
            paginas.push(i);
        }
        return paginas;
    };

    return (
        <Layout user={user} activeSection="configuracion" onLogout={handleLogout}>
            <div className="content-area">
                {/* Mensajes flash */}
                {mensaje && (
                    <div className="flash-container" style={{ marginBottom: '16px' }}>
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

                {/* Modal de confirmación */}
                {modalConfirm.visible && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '32px',
                            maxWidth: '420px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: '#fee2e2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px'
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ fontSize: '28px', color: '#dc2626' }}></i>
                            </div>
                            <h3 style={{ margin: '0 0 12px', fontSize: '20px', color: '#1e293b' }}>
                                ¿Eliminar datos?
                            </h3>
                            <p style={{ margin: '0 0 24px', color: '#64748b', lineHeight: '1.5' }}>
                                ¿Estás seguro de eliminar <strong>TODOS</strong> los datos de <strong>{modalConfirm.nombreTabla}</strong>?<br />
                                Esta acción <strong style={{ color: '#dc2626' }}>no se puede deshacer</strong>.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={cerrarConfirmacion}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={ejecutarEliminacion}
                                    disabled={eliminando}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 500
                                    }}
                                >
                                    {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="config-container">
                    {/* Fila superior */}
                    <div className="config-grid">
                        {/* 1. Limpieza de Datos */}
                        {Number(user?.prioridad) === 0 && (
                            <div className="clean-card">
                                <h2>
                                    <i className="fas fa-broom"></i>
                                    Limpieza de Base de Datos
                                </h2>

                                <button
                                    onClick={() => abrirConfirmacion('estudiantes')}
                                    className="btn-clean btn-red"
                                    disabled={eliminando}
                                    type="button"
                                >
                                    <i className="far fa-trash-alt"></i>
                                    Eliminar datos de ESTUDIANTES
                                </button>

                                <button
                                    onClick={() => abrirConfirmacion('personal_universidad')}
                                    className="btn-clean btn-orange"
                                    disabled={eliminando}
                                    type="button"
                                >
                                    <i className="far fa-trash-alt"></i>
                                    Eliminar datos de FUNCIONARIOS
                                </button>

                                <button
                                    onClick={() => abrirConfirmacion('registros')}
                                    className="btn-clean btn-purple"
                                    disabled={eliminando}
                                    type="button"
                                >
                                    <i className="far fa-trash-alt"></i>
                                    Eliminar REGISTROS DEL FORMULARIO
                                </button>

                                <button
                                    onClick={() => abrirConfirmacion('auditoria_sistema')}
                                    className="btn-clean btn-blue"
                                    disabled={eliminando}
                                    type="button"
                                >
                                    <i className="far fa-trash-alt"></i>
                                    Eliminar REGISTROS DE TABLA LOGS
                                </button>

                                <button
                                    onClick={() => abrirConfirmacion('errores_sistema')}
                                    className="btn-clean btn-blue"
                                    disabled={eliminando}
                                    type="button"
                                >
                                    <i className="far fa-trash-alt"></i>
                                    Eliminar REGISTROS DE TABLA ERRORES
                                </button>
                            </div>
                        )}

                        {/* 2. Errores del Sistema */}
                        <div className="config-card">
                            <div className="config-card-header">
                                <i className="fas fa-exclamation-triangle icon-error"></i>
                                2. Errores del Sistema
                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
                                    Mostrando {errores.length} de {totalErrores} errores
                                </span>
                            </div>

                            <div className="errors-table-container">
                                <table className="errors-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>FECHA Y HORA</th>
                                            <th>MÓDULO</th>
                                            <th>TIPO</th>
                                            <th>MENSAJE</th>
                                            <th>ESTADO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', display: 'block', marginBottom: '12px' }}></i>
                                                    Cargando errores...
                                                </td>
                                            </tr>
                                        ) : errores.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                    <i className="fas fa-check-circle" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                    No hay errores registrados. ¡Todo funciona correctamente!
                                                </td>
                                            </tr>
                                        ) : (
                                            errores.map((error) => {
                                                const estadoBadge = getBadgeEstado(error.estado);
                                                return (
                                                    <tr key={error.id}>
                                                        <td className="error-id">{error.id}</td>
                                                        <td className="error-date">{error.fecha_y_hora}</td>
                                                        <td>{error.modulo}</td>
                                                        <td>
                                                            <span className={`badge ${getBadgeTipo(error.tipo)}`}>{error.tipo}</span>
                                                        </td>
                                                        <td>{error.mensaje}</td>
                                                        <td>
                                                            <span className={`badge ${estadoBadge.clase}`}>
                                                                <span className={`badge-dot ${estadoBadge.dot}`}></span> {error.estado}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {totalPaginas > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => irPagina(paginaActual - 1)}
                                        disabled={paginaActual <= 1}
                                        className={`pagination-btn pagination-prev ${paginaActual <= 1 ? 'pagination-disabled' : ''}`}
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                        Anterior
                                    </button>

                                    <div className="pagination-pages">
                                        {generarRangoPaginas().map((p) => (
                                            p === paginaActual ? (
                                                <span key={p} className="pagination-page pagination-active">{p}</span>
                                            ) : (
                                                <button key={p} onClick={() => irPagina(p)} className="pagination-page">{p}</button>
                                            )
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => irPagina(paginaActual + 1)}
                                        disabled={paginaActual >= totalPaginas}
                                        className={`pagination-btn pagination-next ${paginaActual >= totalPaginas ? 'pagination-disabled' : ''}`}
                                    >
                                        Siguiente
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}

                            <a href="/logs" className="view-all-link">
                                Ver todos los errores <i className="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>

                    {/* Fila inferior */}
                    <div className="config-grid-bottom">
                        {/* 3. Información de Contacto */}
                        <div className="config-card">
                            <div className="config-card-header">
                                <i className="fas fa-user icon-contact"></i>
                                3. Información de Contacto del Ingeniero
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre Completo</label>
                                <div className="form-input-static">ANDRES CAMILO CURVELO DIAZ</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Número de Contacto</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-static">304 316 9783</span>
                                    <i className="fas fa-phone form-input-icon"></i>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Correo Electrónico</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-static">curveloandres@hotmail.com</span>
                                    <i className="fas fa-envelope form-input-icon"></i>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Repositorio del proyecto</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-static">https://github.com/curvelo46/f-m3/tree/main</span>
                                    <i className="fas fa-link form-input-icon"></i>
                                </div>
                            </div>
                            
                        </div>

                        {/* 4. Generador de QR */}
                        <div className="config-card">
                            <div className="config-card-header">
                                <i className="fas fa-qrcode icon-qr"></i>
                                4. Generador de QR
                            </div>
                            <div className="form-group">
                                <label className="form-label">Texto o URL</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={qrTexto}
                                    onChange={(e) => setQrTexto(e.target.value)}
                                    placeholder="Ingresa texto o URL"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tamaño</label>
                                <select
                                    className="form-select"
                                    value={qrTamaño}
                                    onChange={(e) => setQrTamaño(e.target.value)}
                                >
                                    <option value="200">200x200 px</option>
                                    <option value="400">400x400 px</option>
                                    <option value="600">600x600 px</option>
                                    <option value="800">800x800 px</option>
                                </select>
                            </div>

                            <div className="qr-preview" id="qrPreview">
                                {qrImagen ? (
                                    <img src={qrImagen} alt="Código QR" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
                                ) : (
                                    <div className="qr-placeholder">
                                        <i className="fas fa-qrcode" style={{ fontSize: '64px', color: '#cbd5e1' }}></i>
                                        <p style={{ color: '#94a3b8', marginTop: '8px' }}>
                                            {qrGenerando ? 'Generando...' : 'Presiona "Generar" para crear el QR'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="qr-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={generarQR}
                                    disabled={qrGenerando}
                                    style={{ flex: 1 }}
                                >
                                    <i className={`fas ${qrGenerando ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                                    {qrGenerando ? ' Generando...' : ' Generar'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={descargarQR}
                                    disabled={!qrImagen}
                                    style={{ flex: 1 }}
                                >
                                    <i className="fas fa-download"></i> Descargar
                                </button>
                            </div>
                        </div>

                        {/* 5. Cargar Imagen */}
                        <div className="config-card">
                            <div className="config-card-header">
                                <i className="fas fa-image icon-image"></i>
                                5. Cargar Imagen
                            </div>
                            <div
                                className="upload-zone"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('fileInput').click()}
                            >
                                {imagenPreview ? (
                                    <img
                                        src={imagenPreview}
                                        alt="Preview"
                                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                                    />
                                ) : (
                                    <>
                                        <div className="upload-zone-icon">
                                            <i className="fas fa-cloud-upload-alt"></i>
                                        </div>
                                        <div className="upload-zone-text">Arrastra una imagen aquí</div>
                                        <div className="upload-zone-hint">o haz clic para seleccionar</div>
                                        <div className="upload-zone-formats">
                                            Formatos permitidos: JPG, PNG, GIF<br />
                                            Tamaño máximo: 5MB
                                        </div>
                                    </>
                                )}
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                            </div>
                            {imagenFile && (
                                <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                    <i className="fas fa-file-image"></i> {imagenFile.name} ({(imagenFile.size / 1024).toFixed(1)} KB)
                                </div>
                            )}
                            <button
                                className="btn-outline"
                                onClick={subirImagen}
                                disabled={!imagenFile}
                                style={{ marginTop: '12px', width: '100%' }}
                            >
                                <i className="fas fa-upload"></i> Subir imagen
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-label">Descargar Excel</span>
                    <button
                        onClick={() => window.open('/api/reportes/descargar/estudiantes', '_blank')}
                        className="footer-btn footer-btn-green"
                    >
                        <i className="fas fa-download"></i> Estudiantes
                    </button>
                    <button
                        onClick={() => window.open('/api/reportes/descargar/personal_universidad', '_blank')}
                        className="footer-btn footer-btn-blue"
                    >
                        <i className="fas fa-download"></i> Funcionarios
                    </button>
                    <button
                        onClick={() => window.open('/api/reportes/descargar/registros', '_blank')}
                        className="footer-btn footer-btn-purple"
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

export default Configuracion;
