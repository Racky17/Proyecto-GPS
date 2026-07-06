# Proyecto GPS — Gestor de Proyectos y Documentos

Gestor documental con cifrado de archivos, carpetas/conjuntos compartibles,
organizaciones y analítica. Frontend en React 19 + Vite (CoreUI) y backend en
Express + MongoDB.

## Estructura

```
Frontend/   React + Vite (puerto 2200 en dev, nginx:8065 en producción)
backend/    API Express (puerto 8064 en producción, 4000 en dev) + MongoDB
compose.yaml  Orquestación Docker (frontend + backend + mongodb)
Jenkinsfile   Pipeline de testing para Jenkins
jenkins/      Jenkins local con Docker Compose (ver jenkins/README.md)
.github/workflows/ci.yml  Pipeline de CI en GitHub Actions
```

## Desarrollo local

```bash
# Backend (usa fallback en memoria si MongoDB no está disponible)
cd backend && npm install && npm run dev

# Frontend
cd Frontend && npm install && npm start

# Todo con Docker
docker compose up --build
```

Configura `backend/.env` a partir de `backend/.env.example`
(en particular `ENCRYPTION_KEY`, requerida para subir archivos).
La guía completa de credenciales (cifrado, MongoDB/Atlas y login con
Google) está en [CREDENCIALES.md](CREDENCIALES.md).

## Testing

```bash
cd backend && npm test        # Jest + Supertest (no requiere MongoDB)
cd Frontend && npm run lint   # ESLint + Prettier
cd Frontend && npm run build  # Build de producción con Vite
```

## CI/CD

- **GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)):
  en cada push/PR ejecuta los tests del backend, lint y build del frontend,
  y valida que las imágenes Docker se construyan.
- **Jenkins** ([Jenkinsfile](Jenkinsfile)): mismo pipeline para un servidor
  Jenkins propio; ver [jenkins/README.md](jenkins/README.md) para levantarlo
  con Docker Compose.
- El despliegue a Azure Web App quedó como workflow manual
  (`workflow_dispatch`) en `main_proyecto-gps.yml`.

## Dataset data2

El dataset `data2` (8.703 issues de GitHub de proyectos de computación
cuántica) se importa al gestor con:

```bash
# Extraer el zip en backend/data/data2 y luego:
cd backend && npm run seed:data2
```

Crea el conjunto **"data2 - GitHub issues"** con una carpeta por repositorio
(Qiskit, Cirq, PennyLane, etc.) y cada issue como documento cifrado propiedad
del usuario `admin`. El script es idempotente. Usa `MONGODB_URI` para apuntar
a otra base de datos y `DATA2_DIR` para otra ruta de datos.
