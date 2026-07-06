// Jenkinsfile — Pipeline declarativo de testing para Proyecto GPS
//
// Etapas:
//   1. Backend: instalar dependencias y ejecutar tests (Jest + Supertest).
//   2. Frontend: instalar dependencias, lint (ESLint) y build (Vite).
//   3. Docker: validar que las imágenes se construyen (solo en main).
//
// Requiere un agente con Node.js 20+ y (opcionalmente) Docker.
// Ver jenkins/README.md para levantar Jenkins con Docker Compose.
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Backend: dependencias') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend: tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Frontend: dependencias') {
            steps {
                dir('Frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend: lint') {
            steps {
                dir('Frontend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Frontend: build') {
            steps {
                dir('Frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Docker: validar imágenes') {
            when {
                branch 'main'
                expression { sh(script: 'command -v docker', returnStatus: true) == 0 }
            }
            steps {
                sh 'docker build -t gps-backend:ci ./backend'
                sh 'docker build -t gps-upload:ci ./Frontend'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completado: tests y build OK.'
            archiveArtifacts artifacts: 'Frontend/build/**', allowEmptyArchive: true
        }
        failure {
            echo 'Pipeline fallido: revisar la etapa que falló en la consola.'
        }
    }
}
