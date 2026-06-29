import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './Login.css'

const Login = () => {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/api/auth/login', {
                usuario: usuario,
                password: password
            });

            if (response.data.success) {
                // Login exitoso → redirigir al panel principal
                navigate('/panel');
            } else {
                setError(response.data.error || 'Usuario o contraseña incorrectos');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-box">
            <div className="logo">
                <a href="/formulario">
                    <img src="/img/logo.png" alt="Logo" />
                </a>
            </div>

            <h2>Iniciar sesión</h2>

            <form onSubmit={handleSubmit} method="POST">
                <div className="input-group">
                    <input
                        type="text"
                        name="usuario"
                        placeholder="usuario@usa.edu.co"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                        autoFocus
                    />
                </div>

                <div className="input-group">
                    <input
                        type="password"
                        name="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <br />

                <button className="btn-login" type="submit" disabled={loading}>
                    {loading ? 'Cargando...' : 'Siguiente'}
                </button>
            </form>

            {error && <div className="error">{error}</div>}
        </div>
    );
};

export default Login;
