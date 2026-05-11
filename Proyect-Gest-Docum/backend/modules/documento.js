import mongoose from 'mongoose'

const documentoSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    tipo: {
      type: String,
      required: true,
      enum: ['informe', 'contrato', 'manual', 'otro'], // Restringimos los tipos válidos
    },
    rutaArchivo: {
      type: String,
      required: true, // Aquí guardaremos la ruta donde Multer dejó el archivo físico
    },
    // usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Descomentar cuando tengas login
  },
  { timestamps: true },
)

export default mongoose.model('documento', documentoSchema)
