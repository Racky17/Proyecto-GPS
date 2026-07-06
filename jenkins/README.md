# Jenkins — testing continuo del Proyecto GPS

Esta carpeta contiene la infraestructura como código (IaC) para levantar un
Jenkins local que ejecuta el [`Jenkinsfile`](../Jenkinsfile) del repositorio.

## Levantar Jenkins

```bash
cd jenkins
docker compose -f docker-compose.jenkins.yml up -d --build
```

- Interfaz web: <http://localhost:8080>
- Contraseña inicial de administrador:

```bash
docker exec gps-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Configurar el pipeline

1. En Jenkins: **New Item → Pipeline** (o **Multibranch Pipeline**).
2. En *Pipeline → Definition* elegir **Pipeline script from SCM**.
3. SCM: **Git**, repositorio `https://github.com/Racky17/Proyecto-GPS.git`,
   rama `main`.
4. *Script Path*: `Jenkinsfile` (valor por defecto).
5. Guardar y ejecutar **Build Now**.

## Qué ejecuta el pipeline

| Etapa | Comando | Qué valida |
|---|---|---|
| Backend: tests | `npm test` (Jest + Supertest) | API de autenticación, documentos y health check |
| Frontend: lint | `npm run lint` (ESLint) | Calidad estática del código React |
| Frontend: build | `npm run build` (Vite) | Que el frontend compila para producción |
| Docker (solo `main`) | `docker build` | Que las imágenes de despliegue se construyen |

Los tests del backend usan el almacenamiento en memoria (fallback) del
servidor, por lo que **no necesitan MongoDB** para ejecutarse.
