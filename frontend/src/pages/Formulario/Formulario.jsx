import React from 'react';
import { useFormulario } from '../../hooks/useFormulario';
import './Formulario.css';

const Formulario = () => {
    const {
        formData,
        camposDinamicos,
        actividades,
        dependencias,
        buscando,
        enviando,
        mensaje,
        success,
        subActividades,
        handleChange,
        handleSubActividadChange,
        handleBotonToggle,
        handleSubmit,
        resetForm,
        mostrarDependencia,
        mostrarSemestre
    } = useFormulario();

    // Si se envió correctamente, mostrar pantalla de éxito
    if (success) {
        return (
            <div className="success-screen">
                <div className="success-card">
                    <div className="success-icon">✔</div>
                    <h2>Formulario enviado correctamente</h2>
                    <button onClick={resetForm} className="submit-btn">
                        Listo
                    </button>
                </div>
            </div>
        );
    }

    const vinculos = [
        'Estudiante', 'Funcionario', 'Estudiante de posgrado', 'Docente',
        'Directivo', 'Egresado', 'Practicante', 'Contratista',
        'Familiar de Seguridad', 'Comunidad externa', 'Aspirante', 'EXTERNO'
    ];

    const cedes = ['Santa Marta', 'Barranquilla'];
    const semestres = Array.from({ length: 10 }, (_, i) => i + 1);

    return (
        <div className="page-formulario">
            {/* Logo */}
            <div className="logo-top">
                <a href="/login">
                    <img 
                        src="/img/Logo-RGB-U-Sergio-Arboleda-N-03-scaled.png" 
                        alt="Logo Sergio Arboleda" 
                    />
                </a>
            </div>

            <form onSubmit={handleSubmit} className="form-container">
                {/* Header */}
                <header className="form-header">
                    <div className="header-left">
                        <h1>Registro de asistencias y uso de los servicios del Centro Médico</h1>
                    </div>
                </header>

                {/* Mensaje de error/éxito */}
                {mensaje && (
                    <div className={`alert alert-${mensaje.tipo}`}>
                        {mensaje.texto}
                    </div>
                )}

                {/* INFORMACIÓN PERSONAL */}
                <section className="section">
                    <h2>Información Personal</h2>
                    <div className="grid-2">
                        <div>
                            <label>Documento de identidad</label>
                            <input
                                type="text"
                                name="cedula"
                                value={formData.cedula}
                                onChange={(e) => {
                                    const valor = e.target.value.replace(/[^0-9]/g, '');
                                    e.target.value = valor;
                                    handleChange(e);
                                }}
                                className="dropdown"
                                required
                                placeholder="Ingrese cédula"
                            />
                            {buscando && <span className="loading-text">Buscando...</span>}
                        </div>

                        <div>
                            <label>Nombre y apellidos completos</label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={(e) => {
                                    const valor = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                                    e.target.value = valor;
                                    handleChange(e);
                                }}
                                className="dropdown"
                                required
                                placeholder="Nombre completo"
                            />
                        </div>

                        <div>
                            <label>Número de teléfono</label>
                           <input
                                type="text"
                                name="telefono"
                                value={formData.telefono}
                                onChange={(e) => {
                                    const valor = e.target.value.replace(/[^0-9]/g, '');
                                    e.target.value = valor;
                                    handleChange(e);
                                }}
                                className="dropdown"
                                required
                                placeholder="Teléfono"
                            />
                        </div>

                        <div>
                            <label>Vínculo con la Universidad</label>
                            <select
                                name="vinculo"
                                value={formData.vinculo}
                                onChange={handleChange}
                                className="dropdown"
                                required
                            >
                                <option value="">Seleccione una opción</option>
                                {vinculos.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

              {/* INFORMACIÓN DE LA ACTIVIDAD */}
<section className="section">
    <h2>Información de la Actividad</h2>
    
    {/* Fila 1: Selector de Área (ocupa todo el ancho) */}
    <div className="area-selector">
        <label className="group-title">
            Área o Cargo de la actividad en la que participó:
        </label>
        <div className="button-group">
            <input
                type="radio"
                id="centroMedico"
                name="area"
                value="centro"
                checked={formData.area === 'centro'}
                onChange={handleChange}
                hidden
                required
            />
            <label htmlFor="centroMedico" className={`group-btn ${formData.area === 'centro' ? 'active' : ''}`}>
                Centro Médico
            </label>

            <input
                type="radio"
                id="sst"
                name="area"
                value="sst"
                checked={formData.area === 'sst'}
                onChange={handleChange}
                hidden
            />
            <label htmlFor="sst" className={`group-btn ${formData.area === 'sst' ? 'active' : ''}`}>
                Seguridad y Salud en el Trabajo (SST)
            </label>
        </div>
    </div>

    {/* Fila 2: Cede (debajo del área) */}
    <div className="fila-cede" style={{ marginBottom: '16px' }}>
        <label>Cede actual</label>
        <select
            name="cedeactual"
            value={formData.cedeactual}
            onChange={handleChange}
            className="dropdown"
            required
        >
            <option value="">Seleccione una opción</option>
            {cedes.map(c => (
                <option key={c} value={c}>{c}</option>
            ))}
        </select>
    </div>

    {/* Fila 3: Resto de campos en grid de 2 */}
    <div className="grid-2">
        {/* Dependencia */}
        {mostrarDependencia && (
            <div>
                <label>Dependencia / Programa *</label>
                <select
                    name="dependencia"
                    value={formData.dependencia}
                    onChange={handleChange}
                    className="dropdown"
                    required
                >
                    <option value="">Seleccione una opción</option>
                    {dependencias.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>
        )}

        {/* Semestre */}
        {mostrarSemestre && (
            <div>
                <label>Semestre inscrito</label>
                <select
                    name="semestre"
                    value={formData.semestre}
                    onChange={handleChange}
                    className="dropdown"
                    required
                >
                    <option value="">Seleccione una opción</option>
                    {semestres.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>
        )}

        {/* Actividad */}
        <div>
            <label>Actividad o servicio en el que participó</label>
            <select
                name="actividad"
                value={formData.actividad}
                onChange={handleChange}
                className="dropdown"
                required
                disabled={!formData.area}
            >
                <option value="">
                    {formData.area ? 'Seleccione actividad' : 'Seleccione primero un área'}
                </option>
                {formData.area && actividades[formData.area]?.map(act => (
                    <option key={act.id} value={act.nombre}>{act.nombre}</option>
                ))}
            </select>
        </div>
    </div>


                    {/* CAMPOS DINÁMICOS */}
                    {camposDinamicos.length > 0 && (
                        <div className="campos-dinamicos" style={{ marginTop: '20px' }}>
                            <h3>Información adicional</h3>
                            {camposDinamicos.map((campo, index) => (
                                <div key={campo.id} className="campo-dinamico">
                                    <label>
                                        {campo.nombre}
                                        {campo.obligatorio && <span className="required"> *</span>}
                                    </label>

                                    {/* Combo */}
                                    {campo.tipo === 'combo' && (
                                        <select
                                            value={subActividades[`sub_actividad_${index + 1}`] || ''}
                                            onChange={(e) => handleSubActividadChange(index, e.target.value)}
                                            className="dropdown"
                                            required={campo.obligatorio}
                                        >
                                            <option value="">
                                                {campo.placeholder || 'Seleccione...'}
                                            </option>
                                            {campo.opciones.map(op => (
                                                <option key={op} value={op}>{op}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Texto */}
                                    {campo.tipo === 'texto' && (
                                        <input
                                            type="text"
                                            value={subActividades[`sub_actividad_${index + 1}`] || ''}
                                            onChange={(e) => handleSubActividadChange(index, e.target.value)}
                                            className="dropdown"
                                            placeholder={campo.placeholder || ''}
                                            required={campo.obligatorio}
                                        />
                                    )}

                                    {/* Grupo de botones */}
                                    {campo.tipo === 'grupo_botones' && (
                                        <div className="grupo-botones">
                                            <div className="botones-container">
                                                {campo.opciones.map((op, idx) => {
                                                    const seleccionadas = (subActividades[`sub_actividad_${index + 1}`] || '').split(',').filter(Boolean);
                                                    const seleccionado = seleccionadas.includes(op.texto);
                                                    
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            className={`boton-opcion ${seleccionado ? 'seleccionado' : ''}`}
                                                            style={{ 
                                                                backgroundColor: seleccionado ? op.color : '#f0f0f0',
                                                                color: seleccionado ? '#fff' : '#333',
                                                                borderColor: op.color
                                                            }}
                                                            onClick={() => handleBotonToggle(index, op.texto)}
                                                        >
                                                            {op.texto}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <small className="hint">
                                                Seleccionados: {((subActividades[`sub_actividad_${index + 1}`] || '').split(',').filter(Boolean).length)} / {campo.max_seleccion || 7}
                                            </small>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={enviando}
                >
                    {enviando ? 'Enviando...' : 'Enviar'}
                </button>
            </form>
        </div>
    );
};

export default Formulario;
