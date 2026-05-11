import express from 'express'
import { subirDocumento } from '../controllers/documentoController.js'
import upload from '../modules/multermodule.js' // Tu módulo existente

const router = express.Router()

// El middleware 'upload.single("archivo")' intercepta la petición,
// guarda el archivo y luego pasa el control a 'subirDocumento'
router.post('/subir', upload.single('archivo'), subirDocumento)

export default router
