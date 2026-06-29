from flask import Blueprint, request, jsonify, current_app
import pandas as pd
import os
from werkzeug.utils import secure_filename
from database import get_db
from utils import limpiar_columna, limpiar_valor_sqlite, requiere_admin
from config import Config
import numpy as np
from PIL import Image, UnidentifiedImageError

upload_bp = Blueprint('upload', __name__, url_prefix='/api/upload')

# Configuración para imágenes - guardar en public/img del frontend
# Ajusta esta ruta según tu estructura de carpetas
FRONTEND_PUBLIC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'frontend', 'public', 'img')
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


def allowed_image_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def build_image_filename(uploaded_filename, nombre_fijo=""):
    if nombre_fijo:
        nombre_limpio = secure_filename(nombre_fijo).replace('_', '-')
        if not nombre_limpio:
            nombre_limpio = 'imagen-subida'
        return f"{nombre_limpio}.png"

    timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    base_name = secure_filename(os.path.splitext(uploaded_filename)[0]).replace('_', '-')
    if not base_name:
        base_name = 'imagen-subida'
    return f"{timestamp}_{base_name}.png"


def save_image_as_png(file_storage, destination_path):
    file_storage.stream.seek(0)
    with Image.open(file_storage.stream) as img:
        img.load()
        if img.mode in {"RGBA", "LA", "P"}:
            converted_img = img
        else:
            converted_img = img.convert("RGBA")
        converted_img.save(destination_path, format="PNG")


@upload_bp.route("/imagen", methods=["POST"])
@requiere_admin
def upload_imagen():
    """
    Sube una imagen al frontend/public/img con nombre fijo.
    Recibe: multipart/form-data con campo 'imagen' y opcional 'nombre_fijo'
    Si se envía 'nombre_fijo', la imagen se renombra a ese nombre + extensión original.
    """
    print("[DEBUG] Upload imagen endpoint llamado")

    if 'imagen' not in request.files:
        return jsonify({"success": False, "error": "No se envió ningún archivo"}), 400

    file = request.files['imagen']
    nombre_fijo = request.form.get('nombre_fijo', '')
    

    if file.filename == '':
        return jsonify({"success": False, "error": "Nombre de archivo vacío"}), 400

    if not allowed_image_file(file.filename):
        return jsonify({"success": False, "error": "Formato no permitido. Use: PNG, JPG, JPEG, GIF"}), 400

    # Verificar tamaño
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_IMAGE_SIZE:
        return jsonify({"success": False, "error": f"Archivo demasiado grande. Máximo: {MAX_IMAGE_SIZE // (1024*1024)}MB"}), 400

    try:
        # Crear carpeta si no existe
        os.makedirs(FRONTEND_PUBLIC, exist_ok=True)

        filename = build_image_filename(file.filename, nombre_fijo)

        # Si se envió nombre_fijo, eliminar la imagen anterior con el mismo nombre base
        if nombre_fijo:
            nombre_limpio = os.path.splitext(filename)[0]
            for existing_file in os.listdir(FRONTEND_PUBLIC):
                existing_name, existing_ext = os.path.splitext(existing_file)
                if existing_name == nombre_limpio:
                    old_path = os.path.join(FRONTEND_PUBLIC, existing_file)
                    try:
                        os.remove(old_path)
                        print(f"[DEBUG] Imagen anterior eliminada: {existing_file}")
                    except Exception as e:
                        print(f"[WARN] No se pudo eliminar {existing_file}: {e}")

        filepath = os.path.join(FRONTEND_PUBLIC, filename)

        # Guardar siempre como PNG
        save_image_as_png(file, filepath)

        # URL relativa desde public (accesible en React como /img/filename)
        image_url = f"/img/{filename}"

        print(f"[DEBUG] Imagen guardada en: {filepath}")
        print(f"[DEBUG] URL accesible: {image_url}")

        return jsonify({
            "success": True,
            "message": f"Imagen guardada como {filename}",
            "filename": filename,
            "url": image_url,
            "size": file_size,
            "path_frontend": image_url
        })

    except Exception as e:
        print(f"[ERROR] Error subiendo imagen: {str(e)}")
        return jsonify({"success": False, "error": f"Error al guardar imagen: {str(e)}"}), 500


@upload_bp.route("/", methods=["POST"])
@requiere_admin
def upload_excel():
    """
    Procesa upload de estudiantes o personal desde Excel.
    Recibe: multipart/form-data con archivo, tabla y cede
    Soporta dos formatos:
      1. Excel con columnas en español (usa MAPEO_* para renombrar)
      2. Excel con columnas ya en formato base de datos (sin renombrar)
    """
    archivo = request.files.get("archivo")
    tabla = request.form.get("tabla")
    cede = request.form.get("cede")

    if not archivo:
        return jsonify({"success": False, "error": "No se seleccionó archivo"}), 400

    try:
        df = pd.read_excel(archivo)
    except Exception as e:
        return jsonify({"success": False, "error": f"Error leyendo Excel: {str(e)}"}), 400

    # Limpiar nombres de columnas
    df.columns = [limpiar_columna(c) for c in df.columns]

    # Detectar si las columnas ya coinciden con la BD o necesitan mapeo
    columnas_originales = set(df.columns)

    conn = get_db()
    cursor = conn.cursor()
    registros_insertados = 0
    errores = []

    try:
        if tabla == "estudiantes":
            # Verificar si necesita mapeo o ya está en formato BD
            columnas_bd_estudiantes = {
                'numero_identificacion', 'plan_estudio', 'apellido', 'apellido_soltera',
                'nombre', 'segundo_nombre', 'semestre_inscripcion', 'email_institucional',
                'telefono', 'calle', 'fecha_nacimiento', 'edad'
            }

            if columnas_bd_estudiantes.issubset(columnas_originales):
                # Formato 2: Columnas ya en formato BD, no necesita mapeo
                print("📋 Detectado formato BD directo para estudiantes")
            else:
                # Formato 1: Aplicar mapeo
                print("📋 Aplicando mapeo de columnas para estudiantes")
                df.rename(columns=Config.MAPEO_COLUMNAS, inplace=True)

            # Verificar columnas requeridas después del mapeo
            columnas_requeridas = ['numero_identificacion', 'nombre', 'apellido']
            for col in columnas_requeridas:
                if col not in df.columns:
                    return jsonify({
                        "success": False, 
                        "error": f"Columna requerida faltante: {col}. Columnas encontradas: {list(df.columns)}"
                    }), 400

            for idx, row in df.iterrows():
                try:
                    cursor.execute("""
                        INSERT INTO estudiantes (
                            numero_identificacion, plan_estudio, apellido,
                            apellido_soltera, nombre, segundo_nombre,
                            semestre_inscripcion, email_institucional,
                            telefono, calle, fecha_nacimiento, edad, cede
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        limpiar_valor_sqlite(row.get("numero_identificacion", "")),
                        limpiar_valor_sqlite(row.get("plan_estudio", "")),
                        limpiar_valor_sqlite(row.get("apellido", "")),
                        limpiar_valor_sqlite(row.get("apellido_soltera", "")),
                        limpiar_valor_sqlite(row.get("nombre", "")),
                        limpiar_valor_sqlite(row.get("segundo_nombre", "")),
                        limpiar_valor_sqlite(row.get("semestre_inscripcion", "")),
                        limpiar_valor_sqlite(row.get("email_institucional", "")),
                        limpiar_valor_sqlite(row.get("telefono", "")),
                        limpiar_valor_sqlite(row.get("calle", row.get("direccion", ""))),
                        limpiar_valor_sqlite(row.get("fecha_nacimiento")),
                        limpiar_valor_sqlite(row.get("edad")),
                        cede
                    ))
                    registros_insertados += 1
                except Exception as e:
                    errores.append(f"Fila {idx+1}: {str(e)}")

            mensaje = f"✅ {registros_insertados} estudiantes importados correctamente"

        elif tabla == "personal":
            # Verificar si necesita mapeo o ya está en formato BD
            columnas_bd_personal = {
                'personnel_no', 'numero_personal', 'fecha_nacimiento', 'clase_identificacion',
                'numero_identificacion', 'clave_sexo', 'clase_contrato', 'primera_alta',
                'fin_contrato', 'subdivision_personal', 'unidad_organizativa', 'posicion',
                'funcion', 'ce_coste', 'centro_coste'
            }

            if columnas_bd_personal.issubset(columnas_originales):
                # Formato 2: Columnas ya en formato BD, no necesita mapeo
                print("📋 Detectado formato BD directo para personal")
            else:
                # Formato 1: Aplicar mapeo
                print("📋 Aplicando mapeo de columnas para personal")
                df.rename(columns=Config.MAPEO_PERSONAL, inplace=True)

            # Verificar columnas requeridas después del mapeo
            columnas_requeridas = ['personnel_no', 'numero_personal']
            for col in columnas_requeridas:
                if col not in df.columns:
                    return jsonify({
                        "success": False, 
                        "error": f"Columna requerida faltante: {col}. Columnas encontradas: {list(df.columns)}"
                    }), 400

            for idx, row in df.iterrows():
                try:
                    cursor.execute("""
                        INSERT INTO personal_universidad (
                            personnel_no, numero_personal, fecha_nacimiento,
                            clase_identificacion, numero_identificacion, cede,
                            clave_sexo, clase_contrato, primera_alta, fin_contrato,
                            subdivision_personal, unidad_organizativa, posicion,
                            funcion, ce_coste, centro_coste
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        limpiar_valor_sqlite(row.get("personnel_no")),
                        limpiar_valor_sqlite(row.get("numero_personal")),
                        limpiar_valor_sqlite(row.get("fecha_nacimiento")),
                        limpiar_valor_sqlite(row.get("clase_identificacion")),
                        limpiar_valor_sqlite(row.get("numero_identificacion")),
                        cede,
                        limpiar_valor_sqlite(row.get("clave_sexo")),
                        limpiar_valor_sqlite(row.get("clase_contrato")),
                        limpiar_valor_sqlite(row.get("primera_alta")),
                        limpiar_valor_sqlite(row.get("fin_contrato")),
                        limpiar_valor_sqlite(row.get("subdivision_personal")),
                        limpiar_valor_sqlite(row.get("unidad_organizativa")),
                        limpiar_valor_sqlite(row.get("posicion")),
                        limpiar_valor_sqlite(row.get("funcion")),
                        limpiar_valor_sqlite(row.get("ce_coste")),
                        limpiar_valor_sqlite(row.get("centro_coste"))
                    ))
                    registros_insertados += 1
                except Exception as e:
                    errores.append(f"Fila {idx+1}: {str(e)}")

            mensaje = f"✅ {registros_insertados} funcionarios importados correctamente"

        else:
            return jsonify({"success": False, "error": "Tipo de tabla no válido. Use 'estudiantes' o 'personal'"}), 400

        conn.commit()

        respuesta = {
            "success": True,
            "message": mensaje,
            "registros_insertados": registros_insertados,
            "tabla": tabla,
            "cede": cede
        }

        if errores:
            respuesta["errores"] = errores[:10]  # Mostrar primeros 10 errores
            respuesta["total_errores"] = len(errores)

        return jsonify(respuesta)

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": f"Error importando: {str(e)}"}), 500

    finally:
        conn.close()
