import { useState, useEffect } from 'react';
import api from '../api/axiosConfig.js';

export const usePanel = () => {
    const [user, setUser] = useState({ nombre: '', prioridad: 0 });
    const [loading, setLoading] = useState(true);

    // Verificar sesión al cargar
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
            } finally {
                setLoading(false);
            }
        };
        checkSession();
    }, []);

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

    return {
        user,
        loading,
        handleLogout
    };
};