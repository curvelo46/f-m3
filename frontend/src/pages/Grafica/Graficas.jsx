import React, { useState, useEffect, useRef } from 'react';
import { usePanel } from '../../hooks/usePanel.js';
import Layout from '../../components/Layout/Layout.jsx';
import api from '../../api/axiosConfig.js';
import './Graficas.css';

// Importar ECharts
import * as echarts from 'echarts';

const Graficas = () => {
    const { user, handleLogout } = usePanel();

    // ---------- Estados ----------
    const [vista, setVista] = useState('ambas');
    const [area, setArea] = useState('');
    const [cede, setCede] = useState('');
    const [tipoGraficaPrincipal, setTipoGraficaPrincipal] = useState('bar');
    const [tipoGraficaSub, setTipoGraficaSub] = useState('pie');
    const [filtroActividad, setFiltroActividad] = useState('');

    // Datos reales del backend
    const [datosActividades, setDatosActividades] = useState([]);
    const [datosSubActividades, setDatosSubActividades] = useState([]);
    const [datosVinculos, setDatosVinculos] = useState([]);
    const [totales, setTotales] = useState({ registros: 0, estudiantes: 0, funcionarios: 0 });
    const [sedesDisponibles, setSedesDisponibles] = useState([]);
    const [actividadesDisponibles, setActividadesDisponibles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Refs para los charts
    const chartPrincipalRef = useRef(null);
    const chartSubRef = useRef(null);
    const chartPrincipalInstance = useRef(null);
    const chartSubInstance = useRef(null);

    // ---------- Cargar datos desde el backend ----------
    const cargarEstadisticas = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (area) params.append('area', area);
            if (cede) params.append('cede', cede);

            const res = await api.get(`/api/reportes/estadisticas?${params.toString()}`);
            if (res.data.success) {
                setDatosActividades(res.data.actividades_principales || []);
                setDatosSubActividades(res.data.sub_actividades || []);
                setDatosVinculos(res.data.vinculos || []);
                setTotales(res.data.totales || { registros: 0, estudiantes: 0, funcionarios: 0 });
                setSedesDisponibles(res.data.sedes || []);

                // Extraer actividades únicas de las sub-actividades
                const actividadesUnicas = [...new Set(
                    (res.data.sub_actividades || []).map(d => d.actividad_padre).filter(Boolean)
                )];
                setActividadesDisponibles(actividadesUnicas);
            } else {
                setError(res.data.error || 'Error cargando estadísticas');
            }
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
            setError(err.response?.data?.error || 'Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    // Cargar al montar y cuando cambian filtros
    useEffect(() => {
        cargarEstadisticas();
    }, [area, cede]);

    // ---------- Inicializar Charts ----------
    useEffect(() => {
        if (chartPrincipalRef.current && !chartPrincipalInstance.current) {
            chartPrincipalInstance.current = echarts.init(chartPrincipalRef.current);
        }
        if (chartSubRef.current && !chartSubInstance.current) {
            chartSubInstance.current = echarts.init(chartSubRef.current);
        }

        return () => {
            if (chartPrincipalInstance.current) {
                chartPrincipalInstance.current.dispose();
                chartPrincipalInstance.current = null;
            }
            if (chartSubInstance.current) {
                chartSubInstance.current.dispose();
                chartSubInstance.current = null;
            }
        };
    }, []);

    // ---------- Actualizar gráfica principal (Actividades) ----------
    useEffect(() => {
        if (!chartPrincipalInstance.current) return;

        if (datosActividades.length === 0) {
            chartPrincipalInstance.current.setOption({
                title: { text: 'No hay datos disponibles', left: 'center', top: 'center', textStyle: { color: '#94a3b8' } },
                series: []
            }, true);
            return;
        }

        const nombres = datosActividades.map(d => d.nombre);
        const valores = datosActividades.map(d => d.valor);
        const colores = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#dc2626', '#8b5cf6', '#ec4899', '#f59e0b'];

        let option;

        if (tipoGraficaPrincipal === 'bar') {
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: '{b}: {c} registros'
                },
                grid: {
                    left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: nombres,
                    axisLabel: { rotate: 30, fontSize: 11, color: '#64748b' },
                    axisLine: { lineStyle: { color: '#e2e8f0' } }
                },
                yAxis: {
                    type: 'value',
                    name: 'N° Registros',
                    nameTextStyle: { color: '#94a3b8', fontSize: 11 },
                    axisLabel: { color: '#94a3b8' },
                    splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
                },
                series: [{
                    data: valores,
                    type: 'bar',
                    barWidth: '60%',
                    itemStyle: {
                        borderRadius: [6, 6, 0, 0],
                        color: function(params) {
                            return colores[params.dataIndex % colores.length];
                        }
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '{c}',
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: '#64748b'
                    },
                    animationDuration: 1000,
                    animationEasing: 'elasticOut'
                }]
            };
        } else {
            const pieData = datosActividades.map((d, i) => ({
                value: d.valor,
                name: d.nombre,
                itemStyle: { color: colores[i % colores.length] }
            }));

            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    textStyle: { color: '#64748b', fontSize: 11 }
                },
                series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['60%', '50%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}\n{c} ({d}%)',
                        fontSize: 11,
                        color: '#334155'
                    },
                    emphasis: {
                        label: { show: true, fontSize: 14, fontWeight: 'bold' },
                        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' }
                    },
                    data: pieData,
                    animationDuration: 1000,
                    animationEasing: 'cubicOut'
                }]
            };
        }

        chartPrincipalInstance.current.setOption(option, true);
    }, [datosActividades, tipoGraficaPrincipal]);

    // ---------- Actualizar gráfica sub-actividades ----------
    useEffect(() => {
        if (!chartSubInstance.current) return;

        // Filtrar sub-actividades si hay filtro de actividad
        let datosFiltrados = datosSubActividades;
        if (filtroActividad) {
            datosFiltrados = datosSubActividades.filter(d => d.actividad_padre === filtroActividad);
        }

        if (datosFiltrados.length === 0) {
            chartSubInstance.current.setOption({
                title: { text: 'No hay datos disponibles', left: 'center', top: 'center', textStyle: { color: '#94a3b8' } },
                series: []
            }, true);
            return;
        }

        const nombres = datosFiltrados.map(d => d.nombre);
        const valores = datosFiltrados.map(d => d.valor);
        const colores = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#4f46e5', '#7c3aed'];

        let option;

        if (tipoGraficaSub === 'pie') {
            const pieData = datosFiltrados.map((d, i) => ({
                value: d.valor,
                name: d.nombre,
                itemStyle: { color: colores[i % colores.length] }
            }));

            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c} ({d}%)'
                },
                legend: {
                    type: 'scroll',
                    orient: 'vertical',
                    right: 10,
                    top: 20,
                    bottom: 20,
                    textStyle: { color: '#64748b', fontSize: 11 }
                },
                series: [{
                    type: 'pie',
                    radius: ['35%', '65%'],
                    center: ['40%', '50%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}\n{c}',
                        fontSize: 10,
                        color: '#334155'
                    },
                    emphasis: {
                        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' }
                    },
                    data: pieData,
                    animationDuration: 1000,
                    animationEasing: 'cubicOut'
                }]
            };
        } else {
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: '{b}: {c} registros'
                },
                grid: {
                    left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: nombres,
                    axisLabel: { rotate: 30, fontSize: 10, color: '#64748b' },
                    axisLine: { lineStyle: { color: '#e2e8f0' } }
                },
                yAxis: {
                    type: 'value',
                    name: 'N° Registros',
                    nameTextStyle: { color: '#94a3b8', fontSize: 11 },
                    axisLabel: { color: '#94a3b8' },
                    splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
                },
                series: [{
                    data: valores,
                    type: 'bar',
                    barWidth: '50%',
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: function(params) {
                            return colores[params.dataIndex % colores.length];
                        }
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '{c}',
                        fontSize: 11,
                        color: '#64748b'
                    },
                    animationDuration: 1000,
                    animationEasing: 'elasticOut'
                }]
            };
        }

        chartSubInstance.current.setOption(option, true);
    }, [datosSubActividades, tipoGraficaSub, filtroActividad]);

    // ---------- Resize al cambiar tamaño ----------
    useEffect(() => {
        const handleResize = () => {
            if (chartPrincipalInstance.current) chartPrincipalInstance.current.resize();
            if (chartSubInstance.current) chartSubInstance.current.resize();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ---------- Handlers de filtros ----------
    const handleFiltrarPorArea = (areaValue) => {
        setArea(areaValue);
    };

    const handleFiltrarPorCede = (cedeValue) => {
        setCede(cedeValue);
    };

    const handleFiltrarSubActividades = (actividad) => {
        setFiltroActividad(actividad);
    };

    const handleFiltrarTablaVinculos = (dep) => {
        setDependencia(dep);
    };

    const [dependencia, setDependencia] = useState('');

    const vinculosFiltrados = !dependencia
        ? datosVinculos
        : datosVinculos.filter(d => {
            if (dependencia === 'Externos') {
                return d.dependencia === 'Externos' || !d.dependencia;
            }
            return d.dependencia.toLowerCase().includes(dependencia.toLowerCase());
        });

    // ---------- Descargar gráfica ----------
    const descargarGrafica = (chartId) => {
        const chart = chartId === 'graficaActividadesPrincipales' ? chartPrincipalInstance.current : chartSubInstance.current;
        if (!chart) return;

        const url = chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });

        const link = document.createElement('a');
        link.download = `grafica_${chartId}_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = url;
        link.click();
    };

    const expandirGrafica = (chartId) => {
        const container = document.getElementById(chartId);
        if (!container) return;
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        }
    };

    // ---------- Render ----------
    return (
        <Layout user={user} activeSection="graficas" onLogout={handleLogout}>
            <div className="content-area">

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px', display: 'block' }}></i>
                        Cargando estadísticas...
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5'
                    }}>
                        <i className="fas fa-exclamation-circle"></i> {error}
                        <button onClick={cargarEstadisticas} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#991b1b', textDecoration: 'underline', cursor: 'pointer' }}>
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Totales rápidos */}
                {!loading && !error && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        <div style={{ background: '#4f46e5', color: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{totales.registros}</div>
                            <div style={{ fontSize: '13px', opacity: 0.9 }}>Total Registros</div>
                        </div>
                        <div style={{ background: '#059669', color: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{totales.estudiantes}</div>
                            <div style={{ fontSize: '13px', opacity: 0.9 }}>Estudiantes</div>
                        </div>
                        <div style={{ background: '#2563eb', color: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{totales.funcionarios}</div>
                            <div style={{ fontSize: '13px', opacity: 0.9 }}>Funcionarios</div>
                        </div>
                    </div>
                )}

                {/* SELECTOR SUPERIOR DE VISTA */}
                <div className="vista-selector animate-fade-in">
                    <label htmlFor="vistaGraficas">📊 Seleccionar Vista</label>
                    <select
                        id="vistaGraficas"
                        className="dropdown"
                        value={vista}
                        onChange={(e) => setVista(e.target.value)}
                    >
                        <option value="defaul">Tabla Vínculos</option>
                        <option value="ambas">Mostrar Ambas Gráficas</option>
                        <option value="principales">Solo Actividades Principales</option>
                        <option value="sub">Solo Sub-actividades</option>
                    </select>
                </div>

                {/* Filtros Generales */}
                <div className="filtros animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="button-group">
                        <input
                            type="radio"
                            id="centroMedico"
                            name="area"
                            value="centro"
                            hidden
                            checked={area === 'centro'}
                            onChange={() => handleFiltrarPorArea('centro')}
                        />
                        <label htmlFor="centroMedico" className={`group-btn ${area === 'centro' ? 'active' : ''}`}>Centro Médico</label>

                        <input
                            type="radio"
                            id="sst"
                            name="area"
                            value="sst"
                            hidden
                            checked={area === 'sst'}
                            onChange={() => handleFiltrarPorArea('sst')}
                        />
                        <label htmlFor="sst" className={`group-btn ${area === 'sst' ? 'active' : ''}`}>Seguridad y Salud en el Trabajo (SST)</label>

                        <input
                            type="radio"
                            id="todasAreas"
                            name="area"
                            value=""
                            hidden
                            checked={area === ''}
                            onChange={() => handleFiltrarPorArea('')}
                        />
                        <label htmlFor="todasAreas" className={`group-btn ${area === '' ? 'active' : ''}`}>Todas</label>
                    </div>

                    <div className="grupo-control">
                        <label>Sede (Cede)</label>
                        <select
                            name="cede"
                            id="cedeSelect"
                            className="dropdown"
                            value={cede}
                            onChange={(e) => handleFiltrarPorCede(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {sedesDisponibles.map((s, idx) => (
                                <option key={idx} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* PRIMERA GRÁFICA: Actividades Principales */}
                {(vista === 'ambas' || vista === 'principales') && (
                    <div
                        id="seccionPrincipales"
                        className="seccion-grafica activa animate-slide-up"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <div className="chart-card-title">
                                    <i className="fas fa-chart-bar"></i>
                                    Actividades Principales
                                </div>
                                <div className="chart-toggle-group">
                                    <button
                                        type="button"
                                        className={`chart-toggle ${tipoGraficaPrincipal === 'bar' ? 'active' : ''}`}
                                        id="btnPrincipalBar"
                                        onClick={() => setTipoGraficaPrincipal('bar')}
                                    >
                                        <i className="fas fa-chart-bar"></i>
                                        Gráfica de Barras
                                    </button>
                                    <button
                                        type="button"
                                        className={`chart-toggle ${tipoGraficaPrincipal === 'pie' ? 'active' : ''}`}
                                        id="btnPrincipalPie"
                                        onClick={() => setTipoGraficaPrincipal('pie')}
                                    >
                                        <i className="fas fa-chart-pie"></i>
                                        Gráfica de Torta
                                    </button>
                                </div>
                            </div>
                            <div className="chart-subtitle">Total de Registros por Actividad Principal</div>
                            <div className="chart-actions">
                                <i className="fas fa-download" onClick={() => descargarGrafica('graficaActividadesPrincipales')} title="Descargar"></i>
                                <i className="fas fa-expand" onClick={() => expandirGrafica('graficaActividadesPrincipales')} title="Expandir"></i>
                            </div>
                            <div id="graficaActividadesPrincipales" ref={chartPrincipalRef} className="chart-container" style={{ minHeight: '400px' }}></div>
                        </div>
                    </div>
                )}

                {/* SEGUNDA GRÁFICA: Sub-actividades */}
                {(vista === 'ambas' || vista === 'sub') && (
                    <div
                        id="seccionSub"
                        className="seccion-grafica activa animate-slide-up"
                        style={{ animationDelay: '0.3s' }}
                    >
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <div className="chart-card-title">
                                    <i className="fas fa-chart-pie"></i>
                                    Sub-actividades / Campos Dinámicos
                                </div>
                                <div className="chart-toggle-group">
                                    <button
                                        type="button"
                                        className={`chart-toggle ${tipoGraficaSub === 'pie' ? 'active' : ''}`}
                                        id="btnSubPie"
                                        onClick={() => setTipoGraficaSub('pie')}
                                    >
                                        <i className="fas fa-chart-pie"></i>
                                        Gráfica de Torta
                                    </button>
                                    <button
                                        type="button"
                                        className={`chart-toggle ${tipoGraficaSub === 'bar' ? 'active' : ''}`}
                                        id="btnSubBar"
                                        onClick={() => setTipoGraficaSub('bar')}
                                    >
                                        <i className="fas fa-chart-bar"></i>
                                        Gráfica de Barras
                                    </button>
                                </div>
                            </div>
                            <div className="chart-subtitle">Distribución de Sub-actividades por Uso</div>

                            {/* Filtro específico para sub-actividades */}
                            <div className="filtros" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <div className="grupo-control" style={{ margin: 0 }}>
                                    <label>Filtrar por Actividad Principal</label>
                                    <select
                                        id="filtroActividadPrincipal"
                                        className="dropdown"
                                        value={filtroActividad}
                                        onChange={(e) => handleFiltrarSubActividades(e.target.value)}
                                    >
                                        <option value="">Todas las actividades</option>
                                        {actividadesDisponibles.map((act, idx) => (
                                            <option key={idx} value={act}>{act}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="chart-actions">
                                <i className="fas fa-download" onClick={() => descargarGrafica('graficaSubActividades')} title="Descargar"></i>
                                <i className="fas fa-expand" onClick={() => expandirGrafica('graficaSubActividades')} title="Expandir"></i>
                            </div>
                            <div id="graficaSubActividades" ref={chartSubRef} className="chart-container" style={{ minHeight: '400px' }}></div>
                        </div>
                    </div>
                )}

                {/* Tabla de Vínculos */}
                {(vista === 'defaul' || vista === 'ambas') && (
                    <div className="table-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="table-card-header">
                            <div className="table-card-title">
                                <i className="fas fa-link"></i>
                                Vínculos con la Universidad
                            </div>
                            <div className="table-card-filter">
                                <label>Dependencia:</label>
                                <select
                                    id="dependenciaSelect"
                                    value={dependencia}
                                    onChange={(e) => handleFiltrarTablaVinculos(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    <option value="Externos">Externos</option>
                                    <option value="Facultad">Facultades</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-container">
                            <table id="tablaVinculos">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Dependencia</th>
                                        <th>Vínculo</th>
                                        <th>Total Registros</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vinculosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No hay datos de vínculos</td>
                                        </tr>
                                    ) : (
                                        vinculosFiltrados.map((item, idx) => (
                                            <tr key={idx}>
                                                <td><i className="fas fa-circle" style={{ color: '#4f46e5', fontSize: '8px' }}></i></td>
                                                <td>{item.dependencia}</td>
                                                <td>{item.vinculo}</td>
                                                <td><strong>{item.total}</strong></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-left">
                    <span className="footer-label">Descargar Excel</span>
                    <button type="button" onClick={() => window.open('/api/reportes/descargar/estudiantes', '_blank')} className="footer-btn footer-btn-green">
                        <i className="fas fa-download"></i> Estudiantes
                    </button>
                    <button type="button" onClick={() => window.open('/api/reportes/descargar/personal_universidad', '_blank')} className="footer-btn footer-btn-blue">
                        <i className="fas fa-download"></i> Funcionarios
                    </button>
                    <button type="button" onClick={() => window.open('/api/reportes/descargar/registros', '_blank')} className="footer-btn footer-btn-purple">
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

export default Graficas;