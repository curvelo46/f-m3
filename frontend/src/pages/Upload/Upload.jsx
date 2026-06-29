import React, { useState, useRef } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import api from '../../api/axiosConfig';  // ← NUEVO
import Layout from '../../components/Layout/Layout.jsx';
import './Upload.css';

const Upload = () => {
    const { user, handleLogout } = usePanel();

    // ---------- Estados ----------
    const [tabla, setTabla] = useState('estudiantes');
    const [cede, setCede] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [nombreArchivo, setNombreArchivo] = useState('No file selected.');
    const [subiendo, setSubiendo] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [mensaje, setMensaje] = useState(null); // { tipo: 'success'|'error'|'info', texto: '' }

    const fileInputRef = useRef(null);
    const progressInterval = useRef(null);

    const API_BASE = 'http://localhost:5000';

    // ---------- Manejo de archivo ----------
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setArchivo(file);
            setNombreArchivo(file.name);
            setMensaje(null);
        } else {
            setArchivo(null);
            setNombreArchivo('No file selected.');
        }
    };

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
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.xlsx')) {
                setArchivo(file);
                setNombreArchivo(file.name);
                setMensaje(null);
            } else {
                setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos .xlsx' });
            }
        }
    };

    // ---------- Simulación de progreso ----------
    const iniciarProgreso = () => {
        setProgreso(0);
        setSubiendo(true);
        let width = 0;
        progressInterval.current = setInterval(() => {
            if (width >= 90) {
                clearInterval(progressInterval.current);
            } else {
                width += Math.random() * 15;
                if (width > 90) width = 90;
                setProgreso(Math.round(width));
            }
        }, 200);
    };

    const finalizarProgreso = (exito) => {
        clearInterval(progressInterval.current);
        setProgreso(exito ? 100 : 0);
        setTimeout(() => {
            setSubiendo(false);
            setProgreso(0);
        }, exito ? 1500 : 0);
    };

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
            setMensaje({ tipo: 'error', texto: '❌ Error al descargar el archivo Excel' });
        }
    };


    // ---------- Submit (REAL - conectado a la API) ----------
      const handleSubmit = async (e) => {
        e.preventDefault();

        if (!archivo) {
            setMensaje({ tipo: 'error', texto: 'Selecciona un archivo Excel' });
            return;
        }
        if (!cede) {
            setMensaje({ tipo: 'error', texto: 'Selecciona una sede' });
            return;
        }

        iniciarProgreso();

        try {
            const formData = new FormData();
            formData.append('archivo', archivo);
            formData.append('tabla', tabla);
            formData.append('cede', cede);

            const response = await api.post('/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const data = response.data;

            if (!data.success) {
                throw new Error(data.error || 'Error al importar el archivo');
            }

            finalizarProgreso(true);
            setMensaje({ 
                tipo: 'success', 
                texto: `✅ ${data.message || `Archivo "${archivo.name}" importado correctamente`}` 
            });
            
            // Limpiar formulario
            setArchivo(null);
            setNombreArchivo('No file selected.');
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err) {
            console.error('Error en upload:', err);
            finalizarProgreso(false);
            setMensaje({ 
                tipo: 'error', 
                texto: `❌ ${err.response?.data?.error || err.message || 'Error al importar el archivo. Intente nuevamente.'}` 
            });
        }
    };


    

    // ---------- Render ----------
    return (
        <Layout user={user} activeSection="upload" onLogout={handleLogout}>
            <div className="content-area">
                <div className="import-card">
                    <div className="import-card-header">
                        <div className="excel-icon">X</div>
                        <h2>Importar archivo Excel</h2>
                    </div>

                    {/* Flash Messages */}
                    {mensaje && (
                        <div className="flash-messages">
                            <div className={`flash-msg ${mensaje.tipo}`}>
                                <i className={`fas fa-${
                                    mensaje.tipo === 'success' ? 'check-circle' :
                                    mensaje.tipo === 'error' ? 'exclamation-circle' : 'info-circle'
                                }`}></i>
                                {mensaje.texto}
                                <button
                                    className="flash-close"
                                    onClick={() => setMensaje(null)}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="uploadForm">
                        <div className="form-group">
                            <label className="form-label">Seleccione tabla destino:</label>
                            <select
                                name="tabla"
                                className="form-select"
                                value={tabla}
                                onChange={(e) => setTabla(e.target.value)}
                                required
                            >
                                <option value="estudiantes">Estudiantes</option>
                                <option value="personal">Personal Universitario</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Seleccione la sede del archivo:</label>
                            <select
                                name="cede"
                                className="form-select"
                                value={cede}
                                onChange={(e) => setCede(e.target.value)}
                                required
                            >
                                <option value="">-- Seleccione sede --</option>
                                <option value="Santa Marta">Santa Marta</option>
                                <option value="Barranquilla">Barranquilla</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Archivo Excel (.xlsx)</label>
                            <div
                                className="file-input-wrapper"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <button type="button" className="file-input-btn">
                                    <i className="fas fa-folder-open"></i> Buscar archivo...
                                </button>
                                <span className={`file-name ${archivo ? 'has-file' : ''}`}>{nombreArchivo}</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="fileInput"
                                name="archivo"
                                accept=".xlsx"
                                required
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-import"
                            id="btnSubmit"
                            disabled={subiendo}
                        >
                            <i className={`fas ${subiendo ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                            {subiendo ? ' Subiendo...' : ' Importar Excel'}
                        </button>

                        {/* Progress Bar */}
                        {subiendo && (
                            <div className="upload-progress active" id="uploadProgress">
                                <div className="progress-bar-bg">
                                    <div
                                        className="progress-bar-fill"
                                        id="progressBarFill"
                                        style={{ width: `${progreso}%` }}
                                    ></div>
                                </div>
                                <div className="progress-text" id="progressText">
                                    {progreso >= 90 ? 'Procesando datos...' : `Subiendo archivo... ${progreso}%`}
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-label">Descargar Excel</span>
                    <button 
                        onClick={() => descargarExcel('estudiantes')} 
                        className="footer-btn footer-btn-green"
                    >
                        <i className="fas fa-download"></i> Estudiantes
                    </button>
                    <button 
                        onClick={() => descargarExcel('personal_universidad')} 
                        className="footer-btn footer-btn-blue"
                    >
                        <i className="fas fa-download"></i> Funcionarios
                    </button>
                    <button 
                        onClick={() => descargarExcel('registros')} 
                        className="footer-btn footer-btn-purple"
                    >
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

export default Upload;