import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Formulario from './pages/Formulario/Formulario.jsx';
import Login from './pages/Login/Login.jsx';
import Panel from './pages/Panel/Panel.jsx';
import Logs from './pages/Logs/Logs.jsx';
import Graficas from './pages/Grafica/Graficas.jsx';
import Actividades from './pages/Actividades/Actividades.jsx';
import Configuracion from './pages/Comfiguracion/Configuracion.jsx';
import Upload from './pages/Upload/Upload.jsx';
import BasesDatos from './pages/BasesDatos/BasesDatos.jsx';
import Usuarios from './pages/Usuarios/Usuarios.jsx';
import { useAuth } from './hooks/useAuth.js';

const ProtectedRoute = ({ children, forbiddenForPriorities = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
                Cargando...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const prioridad = Number(user?.prioridad ?? 99);

    if (forbiddenForPriorities.includes(prioridad)) {
        return <Navigate to="/panel" replace />;
    }

    return children;
};

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/" element={<Formulario />} />
                <Route path="/formulario" element={<Formulario />} />
                <Route path="/login" element={<Login />} />
                <Route path="/panel" element={<ProtectedRoute><Panel /></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute forbiddenForPriorities={[1]}><Logs /></ProtectedRoute>} />
                <Route path="/graficas" element={<ProtectedRoute><Graficas /></ProtectedRoute>} />
                <Route path="/actividades" element={<ProtectedRoute forbiddenForPriorities={[1]}><Actividades /></ProtectedRoute>} />
                <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute forbiddenForPriorities={[1]}><Upload /></ProtectedRoute>} />
                <Route path="/tablas" element={<ProtectedRoute forbiddenForPriorities={[1]}><BasesDatos /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute forbiddenForPriorities={[1]}><Usuarios /></ProtectedRoute>} />
            </Routes>
        </Router>
    );
}

export default App;
