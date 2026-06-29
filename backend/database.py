import sqlite3
from config import Config


def get_db():
    conn = sqlite3.connect(Config.DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def set_usuario_sesion(email, password):
    """
    Establece el usuario actual en la sesión de la base de datos
    buscando por correo y password. Retorna True si el login es exitoso, False si no.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Buscar usuario por email y password
    cursor.execute("""
        SELECT id, nombre, email, prioridad 
        FROM usuarios 
        WHERE email = ? AND password = ?
    """, (email, password))
    
    usuario = cursor.fetchone()
    
    if usuario is None:
        conn.close()
        return False  # Usuario no encontrado o credenciales incorrectas
    
    # Si el usuario existe, establecer la sesión
    cursor.execute("""
        INSERT OR REPLACE INTO sesion_actual (id, usuario_id, nombre_usuario, fecha_inicio)
        VALUES (1, ?, ?, datetime('now'))
    """, (usuario['id'], usuario['nombre']))
    
    conn.commit()
    conn.close()
    return True  # Sesión establecida correctamente

def get_usuario_sesion():
    """Obtiene el usuario actual de la sesión"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1")
    result = cursor.fetchone()
    conn.close()
    return result if result else (None, None)

def get_usuario_sesion_completo():
    """Obtiene todos los datos del usuario en sesión"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.* 
        FROM usuarios u
        INNER JOIN sesion_actual s ON u.id = s.usuario_id
        WHERE s.id = 1
    """)
    result = cursor.fetchone()
    conn.close()
    return result

def clear_usuario_sesion():
    """Limpia la sesión actual (logout)"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sesion_actual WHERE id = 1")
    conn.commit()
    conn.close()

def verificar_sesion_activa():
    """Verifica si hay una sesión activa y retorna los datos del usuario"""
    usuario = get_usuario_sesion()
    if usuario[0] is None:
        return False
    return True

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # ============================================
    # TABLA DE SESIÓN (para almacenar usuario logueado)
    # ============================================
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sesion_actual (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        usuario_id INTEGER,
        nombre_usuario TEXT,
        fecha_inicio TEXT
    )
    """)





    # ============================================
    # TABLA DE AUDITORÍA
    # ============================================
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS auditoria_sistema (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabla_afectada TEXT NOT NULL,
        tipo_operacion TEXT NOT NULL,
        usuario_id INTEGER,
        nombre_usuario TEXT,
        fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP,
        registro_id INTEGER,
        datos_anteriores TEXT,
        datos_nuevos TEXT
    )
    """)


    cursor.execute("""
    CREATE TABLE IF NOT EXISTS backup_registros(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_timestamp TEXT,
        backup_por TEXT,
        cedula TEXT,
        nombre TEXT,
        telefono TEXT,
        vinculo TEXT,
        area TEXT,
        dependencia TEXT,
        actividad TEXT,
        sub_actividad_1 TEXT,
        sub_actividad_2 TEXT,
        sub_actividad_3 TEXT,
        sub_actividad_4 TEXT,
        sub_actividad_5 TEXT,
        sub_actividad_6 TEXT,
        sub_actividad_7 TEXT,
        cede TEXT,
        semestre TEXT,
        fecha TEXT
    )
    """)



    cursor.execute("""
    CREATE TABLE IF NOT EXISTS errores_sistema (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP,
    modulo TEXT,
    tipo TEXT,           -- 'Error', 'Advertencia', 'Información'
    mensaje TEXT,
    traceback TEXT,
    usuario TEXT,
    ip TEXT,
    url TEXT,
    metodo TEXT,
    estado TEXT DEFAULT 'No resuelto'  -- 'No resuelto', 'En revisión', 'Resuelto'
);
    """)












    # ============================================
    # TABLAS PRINCIPALES DEL SISTEMA
    # ============================================
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        email TEXT UNIQUE,
        password TEXT,
        prioridad INTEGER DEFAULT 1
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS textos_dinamicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area TEXT,
        actividad TEXT,
        nombre_campo TEXT,
        placeholder TEXT,
        es_obligatorio INTEGER DEFAULT 0,
        orden INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS boton_opciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campo_id INTEGER,
        opcion TEXT,
        color TEXT DEFAULT '#5470c6',
        FOREIGN KEY(campo_id) REFERENCES campos_dinamicos(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS estudiantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_identificacion TEXT,
        plan_estudio TEXT,
        apellido TEXT,
        apellido_soltera TEXT,
        nombre TEXT,
        segundo_nombre TEXT,
        semestre_inscripcion TEXT,
        email_institucional TEXT,
        telefono TEXT,
        calle TEXT,
        fecha_nacimiento TEXT,
        cede TEXT,
        edad INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS personal_universidad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        personnel_no TEXT,
        numero_personal TEXT,
        fecha_nacimiento TEXT,
        clase_identificacion TEXT,
        numero_identificacion TEXT,
        cede TEXT,
        clave_sexo TEXT,
        clase_contrato TEXT,
        primera_alta TEXT,
        fin_contrato TEXT,
        subdivision_personal TEXT,
        unidad_organizativa TEXT,
        posicion TEXT,
        funcion TEXT,
        ce_coste TEXT,
        centro_coste TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS registros(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cedula TEXT,
        nombre TEXT,
        telefono TEXT,
        vinculo TEXT,
        area TEXT,
        dependencia TEXT,
        actividad TEXT,
        sub_actividad_1 TEXT,
        sub_actividad_2 TEXT,
        sub_actividad_3 TEXT,
        sub_actividad_4 TEXT,
        sub_actividad_5 TEXT,
        sub_actividad_6 TEXT,
        sub_actividad_7 TEXT,
        cede TEXT,
        semestre TEXT,
        fecha TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS actividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area TEXT,
        nombre TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campos_dinamicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area TEXT,
        actividad TEXT,
        nombre_campo TEXT,
        tipo TEXT,
        placeholder TEXT,
        es_obligatorio INTEGER DEFAULT 0,
        orden INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS combos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area TEXT,
        actividad TEXT,
        nombre_campo TEXT,
        tipo TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS combo_opciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campo_id INTEGER,
        opcion TEXT,
        FOREIGN KEY(campo_id) REFERENCES campos_dinamicos(id)
    )
    """)

    # Insertar actividades por defecto
    cursor.execute("SELECT COUNT(*) FROM actividades")
    if cursor.fetchone()[0] == 0:
        actividades_default = [
            ("centro","Inducción Nuevos Sergistas"),
            ("centro","Consulta Médica"),
            ("centro","Entrega de Medicamentos"),
            ("centro","Procedimiento Médico"),
            ("sst","Pausa Carnavalera"),
            ("sst","Inducción y Reinducción en SST"),
            ("sst","Inspecciones de puesto de trabajo"),
        ]
        cursor.executemany(
            "INSERT INTO actividades (area,nombre) VALUES (?,?)",
            actividades_default
        )

    # ============================================
    # TRIGGERS DE AUDITORÍA
    # ============================================
    
    def crear_trigger_si_no_existe(nombre_trigger, sql_trigger):
        try:
            cursor.execute(sql_trigger)
            print(f"✅ Trigger {nombre_trigger} creado/verificado")
        except sqlite3.Error as e:
            print(f"⚠️  Trigger {nombre_trigger}: {e}")

    # --- TRIGGERS PARA usuarios ---
    
    crear_trigger_si_no_existe("trg_usuarios_insert", """
    CREATE TRIGGER IF NOT EXISTS trg_usuarios_insert 
    AFTER INSERT ON usuarios
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario, 
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'usuarios',
            'INSERT',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            NEW.id,
            NULL,
            ('{"id":' || NEW.id || 
             ',"nombre":"' || IFNULL(NEW.nombre, '') || 
             '","email":"' || IFNULL(NEW.email, '') || 
             '","prioridad":' || IFNULL(NEW.prioridad, 1) || '}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_usuarios_update", """
    CREATE TRIGGER IF NOT EXISTS trg_usuarios_update 
    AFTER UPDATE ON usuarios
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'usuarios',
            'UPDATE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"nombre":"' || IFNULL(OLD.nombre, '') || 
             '","email":"' || IFNULL(OLD.email, '') || 
             '","prioridad":' || IFNULL(OLD.prioridad, 1) || '}'),
            ('{"id":' || NEW.id || 
             ',"nombre":"' || IFNULL(NEW.nombre, '') || 
             '","email":"' || IFNULL(NEW.email, '') || 
             '","prioridad":' || IFNULL(NEW.prioridad, 1) || '}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_usuarios_delete", """
    CREATE TRIGGER IF NOT EXISTS trg_usuarios_delete 
    AFTER DELETE ON usuarios
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'usuarios',
            'DELETE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"nombre":"' || IFNULL(OLD.nombre, '') || 
             '","email":"' || IFNULL(OLD.email, '') || 
             '","prioridad":' || IFNULL(OLD.prioridad, 1) || '}'),
            NULL
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    # --- TRIGGERS PARA estudiantes ---
    
    crear_trigger_si_no_existe("trg_estudiantes_insert", """
    CREATE TRIGGER IF NOT EXISTS trg_estudiantes_insert 
    AFTER INSERT ON estudiantes
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'estudiantes',
            'INSERT',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            NEW.id,
            NULL,
            ('{"id":' || NEW.id || 
             ',"numero_identificacion":"' || IFNULL(NEW.numero_identificacion, '') || 
             '","nombre":"' || IFNULL(NEW.nombre, '') || 
             '","apellido":"' || IFNULL(NEW.apellido, '') || 
             '","email_institucional":"' || IFNULL(NEW.email_institucional, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_estudiantes_update", """
    CREATE TRIGGER IF NOT EXISTS trg_estudiantes_update 
    AFTER UPDATE ON estudiantes
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'estudiantes',
            'UPDATE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"numero_identificacion":"' || IFNULL(OLD.numero_identificacion, '') || 
             '","nombre":"' || IFNULL(OLD.nombre, '') || 
             '","apellido":"' || IFNULL(OLD.apellido, '') || 
             '","email_institucional":"' || IFNULL(OLD.email_institucional, '') || '"}'),
            ('{"id":' || NEW.id || 
             ',"numero_identificacion":"' || IFNULL(NEW.numero_identificacion, '') || 
             '","nombre":"' || IFNULL(NEW.nombre, '') || 
             '","apellido":"' || IFNULL(NEW.apellido, '') || 
             '","email_institucional":"' || IFNULL(NEW.email_institucional, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_estudiantes_delete", """
    CREATE TRIGGER IF NOT EXISTS trg_estudiantes_delete 
    AFTER DELETE ON estudiantes
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'estudiantes',
            'DELETE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"numero_identificacion":"' || IFNULL(OLD.numero_identificacion, '') || 
             ',"nombre":"' || IFNULL(OLD.nombre, '') || 
             ',"apellido":"' || IFNULL(OLD.apellido, '') || 
             ',"email_institucional":"' || IFNULL(OLD.email_institucional, '') || '"}'),
            NULL
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    # --- TRIGGERS PARA personal_universidad ---
    
    crear_trigger_si_no_existe("trg_personal_insert", """
    CREATE TRIGGER IF NOT EXISTS trg_personal_insert 
    AFTER INSERT ON personal_universidad
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'personal_universidad',
            'INSERT',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            NEW.id,
            NULL,
            ('{"id":' || NEW.id || 
             ',"personnel_no":"' || IFNULL(NEW.personnel_no, '') || 
             ',"numero_identificacion":"' || IFNULL(NEW.numero_identificacion, '') || 
             ',"unidad_organizativa":"' || IFNULL(NEW.unidad_organizativa, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_personal_update", """
    CREATE TRIGGER IF NOT EXISTS trg_personal_update 
    AFTER UPDATE ON personal_universidad
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'personal_universidad',
            'UPDATE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"personnel_no":"' || IFNULL(OLD.personnel_no, '') || 
             ',"numero_identificacion":"' || IFNULL(OLD.numero_identificacion, '') || 
             ',"unidad_organizativa":"' || IFNULL(OLD.unidad_organizativa, '') || '"}'),
            ('{"id":' || NEW.id || 
             ',"personnel_no":"' || IFNULL(NEW.personnel_no, '') || 
             ',"numero_identificacion":"' || IFNULL(NEW.numero_identificacion, '') || 
             ',"unidad_organizativa":"' || IFNULL(NEW.unidad_organizativa, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_personal_delete", """
    CREATE TRIGGER IF NOT EXISTS trg_personal_delete 
    AFTER DELETE ON personal_universidad
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'personal_universidad',
            'DELETE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"personnel_no":"' || IFNULL(OLD.personnel_no, '') || 
             ',"numero_identificacion":"' || IFNULL(OLD.numero_identificacion, '') || 
             ',"unidad_organizativa":"' || IFNULL(OLD.unidad_organizativa, '') || '"}'),
            NULL
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    # --- TRIGGERS PARA registros ---
    

    

    crear_trigger_si_no_existe("trg_registros_insert", """
    CREATE TRIGGER IF NOT EXISTS trg_registros_insert 
    AFTER INSERT ON registros
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'registros',
            'INSERT',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            NEW.id,
            NULL,
            ('{"id":' || NEW.id || 
             ',"cedula":"' || IFNULL(NEW.cedula, '') || 
             ',"nombre":"' || IFNULL(NEW.nombre, '') || 
             ',"area":"' || IFNULL(NEW.area, '') || 
             ',"actividad":"' || IFNULL(NEW.actividad, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_registros_update", """
    CREATE TRIGGER IF NOT EXISTS trg_registros_update 
    AFTER UPDATE ON registros
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'registros',
            'UPDATE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"cedula":"' || IFNULL(OLD.cedula, '') || 
             ',"nombre":"' || IFNULL(OLD.nombre, '') || 
             ',"area":"' || IFNULL(OLD.area, '') || 
             ',"actividad":"' || IFNULL(OLD.actividad, '') || '"}'),
            ('{"id":' || NEW.id || 
             ',"cedula":"' || IFNULL(NEW.cedula, '') || 
             ',"nombre":"' || IFNULL(NEW.nombre, '') || 
             ',"area":"' || IFNULL(NEW.area, '') || 
             ',"actividad":"' || IFNULL(NEW.actividad, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)


    crear_trigger_si_no_existe("trg_registros_delete", """
    CREATE TRIGGER IF NOT EXISTS trg_registros_delete 
    AFTER DELETE ON registros
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'registros',
            'DELETE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || 
             ',"cedula":"' || IFNULL(OLD.cedula, '') || 
             ',"nombre":"' || IFNULL(OLD.nombre, '') || 
             ',"area":"' || IFNULL(OLD.area, '') || 
             ',"actividad":"' || IFNULL(OLD.actividad, '') || '"}'),
            NULL
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    # --- TRIGGERS PARA actividades ---
    
    crear_trigger_si_no_existe("trg_actividades_insert", """
    CREATE TRIGGER IF NOT EXISTS trg_actividades_insert 
    AFTER INSERT ON actividades
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'actividades',
            'INSERT',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            NEW.id,
            NULL,
            ('{"id":' || NEW.id || ',"area":"' || IFNULL(NEW.area, '') || ',"nombre":"' || IFNULL(NEW.nombre, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_actividades_update", """
    CREATE TRIGGER IF NOT EXISTS trg_actividades_update 
    AFTER UPDATE ON actividades
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'actividades',
            'UPDATE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || ',"area":"' || IFNULL(OLD.area, '') || ',"nombre":"' || IFNULL(OLD.nombre, '') || '"}'),
            ('{"id":' || NEW.id || ',"area":"' || IFNULL(NEW.area, '') || ',"nombre":"' || IFNULL(NEW.nombre, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_actividades_delete", """
    CREATE TRIGGER IF NOT EXISTS trg_actividades_delete 
    AFTER DELETE ON actividades
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'actividades',
            'DELETE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || ',"area":"' || IFNULL(OLD.area, '') || ',"nombre":"' || IFNULL(OLD.nombre, '') || '"}'),
            NULL
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    # --- TRIGGERS PARA campos_dinamicos ---
    
    crear_trigger_si_no_existe("trg_campos_dinamicos_insert", """
    CREATE TRIGGER IF NOT EXISTS trg_campos_dinamicos_insert 
    AFTER INSERT ON campos_dinamicos
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'campos_dinamicos',
            'INSERT',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            NEW.id,
            NULL,
            ('{"id":' || NEW.id || ',"area":"' || IFNULL(NEW.area, '') || ',"actividad":"' || IFNULL(NEW.actividad, '') || ',"nombre_campo":"' || IFNULL(NEW.nombre_campo, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_campos_dinamicos_update", """
    CREATE TRIGGER IF NOT EXISTS trg_campos_dinamicos_update 
    AFTER UPDATE ON campos_dinamicos
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'campos_dinamicos',
            'UPDATE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || ',"nombre_campo":"' || IFNULL(OLD.nombre_campo, '') || ',"tipo":"' || IFNULL(OLD.tipo, '') || '"}'),
            ('{"id":' || NEW.id || ',"nombre_campo":"' || IFNULL(NEW.nombre_campo, '') || ',"tipo":"' || IFNULL(NEW.tipo, '') || '"}')
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    crear_trigger_si_no_existe("trg_campos_dinamicos_delete", """
    CREATE TRIGGER IF NOT EXISTS trg_campos_dinamicos_delete 
    AFTER DELETE ON campos_dinamicos
    BEGIN
        INSERT INTO auditoria_sistema 
            (tabla_afectada, tipo_operacion, usuario_id, nombre_usuario,
             registro_id, datos_anteriores, datos_nuevos)
        SELECT 
            'campos_dinamicos',
            'DELETE',
            COALESCE(s.usuario_id, 0),
            COALESCE(s.nombre_usuario, 'Sistema'),
            OLD.id,
            ('{"id":' || OLD.id || ',"nombre_campo":"' || IFNULL(OLD.nombre_campo, '') || ',"tipo":"' || IFNULL(OLD.tipo, '') || '"}'),
            NULL
        FROM (SELECT usuario_id, nombre_usuario FROM sesion_actual WHERE id = 1) AS s;
    END;
    """)

    conn.commit()
    conn.close()
    print("✅ Base de datos inicializada con sistema de auditoría completo")

# Funciones para consultar auditoría
def obtener_auditoria(tabla=None, limite=100):
    """Obtiene registros de auditoría, opcionalmente filtrados por tabla"""
    conn = get_db()
    cursor = conn.cursor()
    
    if tabla:
        cursor.execute("""
            SELECT * FROM auditoria_sistema 
            WHERE tabla_afectada = ? 
            ORDER BY fecha_hora DESC 
            LIMIT ?
        """, (tabla, limite))
    else:
        cursor.execute("""
            SELECT * FROM auditoria_sistema 
            ORDER BY fecha_hora DESC 
            LIMIT ?
        """, (limite,))
    
    resultados = cursor.fetchall()
    conn.close()
    return resultados

def obtener_estadisticas_auditoria():
    """Obtiene estadísticas de uso del sistema"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            tabla_afectada,
            tipo_operacion,
            COUNT(*) as total,
            COUNT(DISTINCT usuario_id) as usuarios_distintos,
            MAX(fecha_hora) as ultima_operacion
        FROM auditoria_sistema
        GROUP BY tabla_afectada, tipo_operacion
        ORDER BY tabla_afectada, tipo_operacion
    """)
    
    resultados = cursor.fetchall()
    conn.close()
    return resultados