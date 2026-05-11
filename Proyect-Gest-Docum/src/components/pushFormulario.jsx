import React, { useState } from 'react'

const FormularioSubida = ({ onUploadSuccess }) => {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Para enviar archivos + texto, DEBEMOS usar FormData
    const formData = new FormData()
    formData.append('titulo', titulo)
    formData.append('tipo', tipo)
    formData.append('archivo', archivo)

    try {
      const response = await fetch('http://localhost:3000/api/documentos/subir', {
        method: 'POST',
        body: formData, // Fetch ajusta los headers (multipart/form-data) automáticamente
      })

      if (response.ok) {
        // Limpiar formulario o notificar éxito
        onUploadSuccess()
      } else {
        console.error('Error al subir')
      }
    } catch (error) {
      console.error('Error de red', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded shadow-md"
      aria-labelledby="form-titulo"
    >
      <h2 id="form-titulo" className="text-xl mb-4 font-bold">
        Subir Nuevo Documento
      </h2>

      {/* Input de Texto Accesible */}
      <div className="mb-4 flex flex-col">
        <label htmlFor="doc-titulo" className="mb-1 font-medium text-gray-700">
          Título del Documento *
        </label>
        <input
          id="doc-titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
          aria-required="true"
        />
      </div>

      {/* Select Accesible */}
      <div className="mb-4 flex flex-col">
        <label htmlFor="doc-tipo" className="mb-1 font-medium text-gray-700">
          Tipo de Documento *
        </label>
        <select
          id="doc-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          required
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
          aria-required="true"
        >
          <option value="">Seleccione un tipo</option>
          <option value="informe">Informe</option>
          <option value="contrato">Contrato</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {/* Input File Accesible */}
      <div className="mb-6 flex flex-col">
        <label htmlFor="doc-archivo" className="mb-1 font-medium text-gray-700">
          Seleccionar Archivo (PDF, Word) *
        </label>
        <input
          id="doc-archivo"
          type="file"
          onChange={(e) => setArchivo(e.target.files[0])}
          required
          className="border p-2 rounded"
          aria-required="true"
          aria-describedby="file-help"
        />
        <span id="file-help" className="text-sm text-gray-500 mt-1">
          El tamaño máximo permitido es 10MB.
        </span>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !archivo || !titulo || !tipo}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Subiendo...' : 'Subir Archivo'}
      </button>
    </form>
  )
}

export default FormularioSubida
