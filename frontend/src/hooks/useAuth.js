import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (email, password) => {
        const response = await api.post('/api/auth/login', { email, password });
        
        
        setUser(response.data.user);
        return response.data;
    };

    const logout = async () => {
        await api.post('/api/auth/logout');
        setUser(null);
    };

    const checkSession = async () => {
        try {
            const response = await api.get('/api/auth/session');
            setUser(response.data.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    return { user, loading, login, logout };
};