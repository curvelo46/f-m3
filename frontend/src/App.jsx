import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Formulario from './pages/Formulario/Formulario.jsx';
import Login from './pages/Login/Login.jsx';
import Panel from './pages/Panel/Panel.jsx';
import Logs from './pages/Logs/Logs.jsx';
import Graficas from './pages/Grafica/Graficas.jsx';  // ← carpeta: Grafica, archivo: Graficas.jsx
import Actividades from './pages/Actividades/Actividades.jsx';
import Configuracion from './pages/Comfiguracion/Configuracion.jsx';
import Upload from './pages/Upload/Upload.jsx';
import BasesDatos from './pages/BasesDatos/BasesDatos.jsx';
import Usuarios from './pages/Usuarios/Usuarios.jsx';

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/" element={<Formulario />} />
                <Route path="/formulario" element={<Formulario />} />
                <Route path="/login" element={<Login />} />
                <Route path="/panel" element={<Panel />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/graficas" element={<Graficas />} />  
                <Route path="/actividades" element={<Actividades />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/upload" element={<Upload />} /> 
                <Route path="/tablas" element={<BasesDatos />} /> 
                <Route path="/usuarios" element={<Usuarios />} /> 
                
            </Routes>
        </Router>
    );
}

export default App;