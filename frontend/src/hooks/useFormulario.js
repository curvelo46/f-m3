import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';

export const useFormulario = () => {
    const [formData, setFormData] = useState({
        cedula: '',
        nombre: '',
        telefono: '',
        vinculo: '',
        area: '',
        cedeactual: '',
        dependencia: '',
        semestre: '',
        actividad: ''
    });

    const [camposDinamicos, setCamposDinamicos] = useState([]);
    const [actividades, setActividades] = useState({ centro: [], sst: [] });
    const [dependencias, setDependencias] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [success, setSuccess] = useState(false);
    const [subActividades, setSubActividades] = useState({});

    // Cargar actividades al inicio
    useEffect(() => {
        const cargarActividades = async () => {
            try {
                const response = await api.get('/api/actividades/');
                if (response.data.success) {
                    setActividades(response.data.actividades);
                }
            } catch (error) {
                console.error('Error cargando actividades:', error);
            }
        };
        cargarActividades();
    }, []);

    // Buscar persona por cédula
    const buscarPersona = useCallback(async (cedula) => {
        if (cedula.length < 5) return;
        
        setBuscando(true);
        try {
            const response = await api.get(`/api/registros/buscar_persona?cedula=${cedula}`);
            const data = response.data;
            
            if (data.encontrado) {
                setFormData(prev => ({
                    ...prev,
                    nombre: data.nombre || prev.nombre,
                    telefono: data.telefono || prev.telefono,
                    vinculo: data.vinculo || prev.vinculo,
                    dependencia: data.dependencia || prev.dependencia
                }));
            }
        } catch (error) {
            console.error('Error buscando persona:', error);
        } finally {
            setBuscando(false);
        }
    }, []);

    // Cargar campos dinámicos cuando cambia la actividad
    useEffect(() => {
        const cargarCampos = async () => {
            if (!formData.actividad) {
                setCamposDinamicos([]);
                return;
            }
            
            try {
                const response = await api.get(
                    `/api/actividades/campos/formulario?actividad=${encodeURIComponent(formData.actividad)}`
                );
                if (response.data.success) {
                    setCamposDinamicos(response.data.campos || []);
                    // Inicializar sub-actividades vacías
                    const initialSub = {};
                    response.data.campos.forEach((campo, idx) => {
                        initialSub[`sub_actividad_${idx + 1}`] = '';
                    });
                    setSubActividades(initialSub);
                }
            } catch (error) {
                console.error('Error cargando campos dinámicos:', error);
            }
        };
        cargarCampos();
    }, [formData.actividad]);

    // Cargar dependencias según el vínculo
    useEffect(() => {
        const cargarDependencias = async () => {
            if (formData.vinculo === 'Estudiante') {
                try {
                    const response = await api.get('/api/dependencias/estudiantes');
                    if (response.data.success) {
                        setDependencias(response.data.dependencias);
                    }
                } catch (error) {
                    console.error('Error cargando dependencias:', error);
                }
            } else if (['Funcionario', 'Docente', 'Directivo', 'Practicante'].includes(formData.vinculo)) {
                try {
                    const response = await api.get('/api/dependencias/funcionarios');
                    if (response.data.success) {
                        setDependencias(response.data.dependencias);
                    }
                } catch (error) {
                    console.error('Error cargando dependencias:', error);
                }
            } else {
                setDependencias([]);
            }
        };
        cargarDependencias();
    }, [formData.vinculo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Si cambia la cédula, buscar persona
        if (name === 'cedula' && value.length >= 5) {
            buscarPersona(value);
        }
        
        // Si cambia el área, limpiar actividad
        if (name === 'area') {
            setFormData(prev => ({ ...prev, actividad: '', dependencia: '' }));
        }
    };

    const handleSubActividadChange = (index, value) => {
        setSubActividades(prev => ({
            ...prev,
            [`sub_actividad_${index + 1}`]: value
        }));
    };

    const handleBotonToggle = (campoIndex, opcionTexto) => {
        const key = `sub_actividad_${campoIndex + 1}`;
        setSubActividades(prev => {
            const current = prev[key] || '';
            const seleccionadas = current ? current.split(',') : [];
            
            if (seleccionadas.includes(opcionTexto)) {
                // Quitar
                const nuevas = seleccionadas.filter(s => s !== opcionTexto);
                return { ...prev, [key]: nuevas.join(',') };
            } else {
                // Agregar
                if (seleccionadas.length < 7) {
                    return { ...prev, [key]: [...seleccionadas, opcionTexto].join(',') };
                }
                return prev;
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEnviando(true);
        setMensaje(null);

        try {
            const payload = new FormData();
            
            // Datos básicos
            Object.keys(formData).forEach(key => {
                if (formData[key]) {
                    payload.append(key, formData[key]);
                }
            });
            
            // Sub-actividades
            Object.keys(subActividades).forEach(key => {
                payload.append(key, subActividades[key]);
            });

            const response = await api.post('/api/registros/', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setSuccess(true);
                setMensaje({ tipo: 'success', texto: 'Formulario enviado correctamente' });
            } else {
                setMensaje({ tipo: 'error', texto: response.data.message || 'Error al enviar' });
            }
        } catch (error) {
            setMensaje({ 
                tipo: 'error', 
                texto: error.response?.data?.message || 'Error de conexión' 
            });
        } finally {
            setEnviando(false);
        }
    };

    const resetForm = () => {
        setFormData({
            cedula: '',
            nombre: '',
            telefono: '',
            vinculo: '',
            area: '',
            cedeactual: '',
            dependencia: '',
            semestre: '',
            actividad: ''
        });
        setCamposDinamicos([]);
        setSubActividades({});
        setSuccess(false);
        setMensaje(null);
    };

    const mostrarDependencia = ['Estudiante', 'Funcionario', 'Docente', 'Directivo', 'Practicante', 'Estudiante de posgrado'].includes(formData.vinculo);
    const mostrarSemestre = formData.vinculo === 'Estudiante' || formData.vinculo === 'Estudiante de posgrado';

    return {
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
    };
};
