# Configuración de credenciales de autenticación — Proyecto GPS

Guía paso a paso para dejar operativa la autenticación y el cifrado del
gestor documental. Hay **tres bloques de credenciales**: la clave de cifrado
de archivos, la conexión a MongoDB y (opcional) el inicio de sesión con
Google.

> ⚠️ **Nunca subas el archivo `.env` a git.** Ya está en `.gitignore`; las
> plantillas públicas son `backend/.env.example` y `Frontend/.env.example`.

---

## 1. Backend — archivo `backend/.env`

Crea el archivo copiando la plantilla:

```bash
cd backend
cp .env.example .env      # en Windows: copy .env.example .env
```

### 1.1 Clave de cifrado de archivos (`ENCRYPTION_KEY`) — obligatoria

Todos los archivos subidos se cifran con AES-256-GCM usando esta clave.
Sin ella, la subida y descarga de documentos falla.

1. Genera una clave de 32 bytes en hexadecimal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Copia el resultado (64 caracteres hex) en el `.env`:
   ```env
   ENCRYPTION_KEY=<pega-aquí-los-64-caracteres>
   ```

**Importante**: si cambias la clave después de haber subido documentos,
esos documentos ya no se podrán descifrar. Guarda una copia segura de la
clave (gestor de contraseñas) y usa la misma en todos los entornos que
compartan base de datos.

### 1.2 Conexión a MongoDB (`MONGODB_URI`, `MONGODB_DB`)

**Opción A — MongoDB local (desarrollo):**
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=proyecto_gps
```

**Opción B — MongoDB Atlas (nube):**
1. Entra a <https://cloud.mongodb.com> → tu clúster → **Connect → Drivers**
   y copia la cadena `mongodb+srv://usuario:contraseña@cluster...`.
2. En **Database Access** crea (o usa) un usuario de base de datos con rol
   `readWrite`.
3. En **Network Access** añade tu IP (o `0.0.0.0/0` solo para pruebas).
4. Pega la URI en el `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/?appName=Proyecto-GPS
   MONGODB_DB=DB1-GPS
   ```

> 🔧 **Si aparece `querySrv ECONNREFUSED`**: el DNS de tu red no resuelve
> registros SRV. Soluciones: (a) cambiar el DNS de Windows a `8.8.8.8`, o
> (b) usar el formato sin SRV con los hosts explícitos del clúster, como
> está configurado actualmente en este proyecto:
> ```env
> MONGODB_URI=mongodb://<usuario>:<contraseña>@<host-shard-00>:27017,<host-shard-01>:27017,<host-shard-02>:27017/?ssl=true&authSource=admin&replicaSet=<nombre-replicaset>&appName=Proyecto-GPS
> ```
> Los hosts y el `replicaSet` se obtienen con:
> `nslookup -type=SRV _mongodb._tcp.<cluster>.mongodb.net 8.8.8.8` y
> `nslookup -type=TXT <cluster>.mongodb.net 8.8.8.8`.

Si MongoDB no está disponible, el backend arranca igualmente con datos en
memoria (usuario `admin` / `admin123`) — útil para desarrollo y tests, pero
los datos se pierden al reiniciar.

### 1.3 Otros valores del backend

```env
PORT=4000                                # puerto de la API en desarrollo
FRONTEND_ORIGIN=http://localhost:2200    # origen permitido por CORS
```

---

## 2. Frontend — archivo `Frontend/.env.development`

```env
VITE_API_BASE_URL=http://localhost:4000   # URL del backend en desarrollo
VITE_GOOGLE_CLIENT_ID=                    # ver sección 3 (opcional)
```

En producción (Docker) no se usa este archivo: nginx hace proxy de `/api`
al backend y `VITE_API_BASE_URL` queda vacío.

---

## 3. Inicio de sesión con Google (opcional)

Si `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` quedan vacíos, el botón de
Google simplemente no se muestra y el login clásico funciona igual.

### 3.1 Crear el Client ID en Google Cloud Console

1. Entra a <https://console.cloud.google.com/> con tu cuenta de Google.
2. Crea un proyecto (ej. **Proyecto-GPS**) desde el selector superior.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** → Crear.
   - Nombre de la app, correo de asistencia y contacto del desarrollador.
   - Guarda. En modo *Testing*, añade en **Test users** los correos Gmail
     que usarán el login.
4. **APIs y servicios → Credenciales → + Crear credenciales →
   ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: `Proyecto-GPS Web`.
   - **Orígenes de JavaScript autorizados** (sin barra final):
     - `http://localhost:2200` (frontend en desarrollo)
     - `http://localhost`
     - El dominio real de despliegue, ej. `http://pacheco.chillan.ubiobio.cl:8065`
   - No se necesita URI de redirección (se usa el botón de Google Identity
     Services, no el flujo de redirección).
5. Copia el **ID de cliente** (formato `xxxx.apps.googleusercontent.com`).

### 3.2 Configurar el Client ID en el proyecto

El **mismo** Client ID va en los dos lados:

```env
# backend/.env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Frontend/.env.development
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

Reinicia backend (`npm run dev`) y frontend (`npm start`). El botón
"Continuar con Google" aparecerá en la página de login.

### 3.3 Cómo funciona (resumen técnico)

1. El frontend carga Google Identity Services y muestra el botón oficial.
2. Google devuelve un *ID token* (JWT) firmado.
3. El frontend lo envía a `POST /api/auth/google`.
4. El backend verifica la firma y la audiencia con `google-auth-library`,
   crea el usuario si no existe (sin contraseña local) y emite el token de
   sesión normal de la aplicación.

---

## 4. Usuario administrador por defecto

Al conectar por primera vez con una base de datos vacía, el backend crea:

| Usuario | Contraseña |
|---|---|
| `admin` | `admin123` |

**Cámbiala en cualquier despliegue real** (o elimina el usuario tras crear
el tuyo).

---

## 5. Verificación rápida

```bash
# 1. El backend arranca y conecta a MongoDB
cd backend && npm run dev
#    → "Connected to MongoDB (db: ...)"

# 2. La API responde
curl http://localhost:4000/api/health

# 3. Los tests pasan
npm test

# 4. El frontend apunta al backend correcto
cd ../Frontend && npm start   # abrir http://localhost:2200 y hacer login
```
