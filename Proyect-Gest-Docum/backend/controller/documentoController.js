import documento from '../modules/documento.js'

export const subirDocumento = async (req, res) => {
  try {
    // req.file lo genera tu 'multermodule.js'
    // req.body contiene el resto de los campos de texto

    if (!req.file) {
      return res.status(400).json({ mensaje: 'Por favor, adjunta un archivo.' })
    }

    const { titulo, tipo } = req.body

    const nuevoDocumento = new documento({
      titulo,
      tipo,
      rutaArchivo: req.file.path, // Guardamos la ruta física del archivo
    })

    await nuevoDocumento.save()

    res.status(201).json({ mensaje: 'Documento guardado exitosamente', documento: nuevoDocumento })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al guardar el documento', error: error.message })
  }
}
