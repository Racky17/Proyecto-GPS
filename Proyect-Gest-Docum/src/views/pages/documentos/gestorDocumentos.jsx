import React, { useState } from 'react'
import FormularioSubida from '../../../components/pushFormulario' // Asegura la ruta correcta

const GestorDocumentos = () => {
  const [mensajeExito, setMensajeExito] = useState('')

  const handleUploadSuccess = () => {
    setMensajeExito('El documento ha sido subido y registrado correctamente.')
    // Quitamos el mensaje después de 5 segundos
    setTimeout(() => setMensajeExito(''), 5000)

    // Aquí a futuro llamaremos a una función para recargar la lista de documentos
  }

  return (
    <main className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Documentos</h1>
        <p className="text-gray-600">Sube, filtra y administra los documentos del sistema.</p>
      </header>

      {/* Zona de Notificaciones Accesible */}
      {mensajeExito && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded"
        >
          {mensajeExito}
        </div>
      )}

      <section className="mb-8">
        <FormularioSubida onUploadSuccess={handleUploadSuccess} />
      </section>

      {/* Aquí insertaremos el Filtro y la Tabla en el siguiente paso */}
      <section aria-label="Lista de documentos">
        {/* <FiltroDocumentos /> */}
        {/* <TablaDocumentos /> */}
      </section>
    </main>
  )
}

export default GestorDocumentos
