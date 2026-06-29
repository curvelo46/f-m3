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
    edad INTEGER
);

CREATE TABLE IF NOT EXISTS personal_universidad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personnel_no TEXT,
    numero_personal TEXT,
    fecha_nacimiento TEXT,
    clase_identificacion TEXT,
    numero_identificacion TEXT,
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
);