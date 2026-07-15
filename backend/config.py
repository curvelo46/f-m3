import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or "clave_secreta"
    DB_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    DB_NAME = os.path.join(DB_FOLDER, "database.db")
    
    # Mapeos de columnas Excel
    MAPEO_COLUMNAS = {
        "apellido_de_soltera": "apellido_soltera",
        "segundo_nompila": "segundo_nombre",
        "semestre_inscrip": "semestre_inscripcion",
        "email_inst": "email_institucional",
        "calle": "direccion",
        "fecha_de_nacimiento": "fecha_nacimiento",
        "edad": "fecha_referencia_edad"
    }

    MAPEO_PERSONAL = {
        "personnel_no": "personnel_no",
        "numero_de_personal": "numero_personal",  # ← CORREGIDO: era "nombre_personal"
        "fecha_nac": "fecha_nacimiento",
        "clase_de_identificacion_clase": "clase_identificacion",
        "numero_de_identificacion": "numero_identificacion",  
        "clave_de_sexo": "sexo",
        "clase_de_contrato": "clase_contrato",
        "1a_alta": "fecha_primera_alta",
        "fin_contr": "fecha_fin_contrato",
        "subdivision_de_personal": "subdivision_personal",
        "unidad_organizativa": "unidad_organizativa",
        "posicion": "posicion",
        "funcion": "funcion",
        "cecoste": "codigo_centro_coste",
        "centro_de_coste": "centro_coste"
    }

    NOMBRES_VISIBLES = {
        "numero_personal": "nombre",
        "numero_identificacion": "cedula",
        "fecha_nacimiento": "fecha nacimiento",
        "unidad_organizativa": "dependencia",
        "ce_coste": "centro costo"
    }

    # Intervalo de respaldo automático en segundos (aprox. 60 días)
    BACKUP_INTERVAL_SECONDS = 60 * 24 * 3600
