import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig.js';

export const useLogs = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buscar, setBuscar] = useState('');
    const [user, setUser] = useState({ nombre: '', prioridad: 0 });

    // Verificar sesión
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get('/api/auth/session');
                if (response.data.activa) {
                    setUser(response.data.user);
                } else {
                    window.location.href = '/login';
                }
            } catch {
                window.location.href = '/login';
            }
        };
        checkSession();
    }, []);

    // Cargar datos de auditoría
    const cargarAuditoria = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (buscar) params.append('buscar', buscar);
            
            const response = await api.get(`/api/auth/auditoria?${params.toString()}`);
            if (response.data.success) {
                setDatos(response.data.auditoria);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error cargando datos');
        } finally {
            setLoading(false);
        }
    }, [buscar]);

    useEffect(() => {
        cargarAuditoria();
    }, [cargarAuditoria]);

    // Búsqueda con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            cargarAuditoria();
        }, 300);
        return () => clearTimeout(timer);
    }, [buscar, cargarAuditoria]);

    const handleBuscar = (e) => {
        setBuscar(e.target.value);
    };

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout');
            sessionStorage.clear();
            localStorage.removeItem('sessionData');
            window.location.href = '/login';
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    };

    const descargarExcel = async (tabla) => {
        try {
            const response = await api.get(`/api/reportes/descargar/${tabla}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${tabla}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error descargando:', error);
        }
    };

    return {
        datos,
        loading,
        error,
        buscar,
        user,
        handleBuscar,
        handleLogout,
        descargarExcel
    };
};