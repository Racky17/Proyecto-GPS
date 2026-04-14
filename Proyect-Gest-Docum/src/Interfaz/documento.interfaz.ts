// Define los estados posibles para evitar errores de dedo (typos)
export const DocumentoStatus = {
  Draft: "Borrador",
  InReview: "En Revisión",
  Approved: "Aprobado",
  Archived: "Archivado",
} as const;

export type DocumentoStatus =
  (typeof DocumentoStatus)[keyof typeof DocumentoStatus];

// Define la estructura del objeto Documento
export interface IDocumento {
  id: string;
  title: string;
  author: string;
  version: string;
  status: DocumentoStatus;
  updatedAt: Date;
  description?: string; // El '?' significa que es opcional
}
