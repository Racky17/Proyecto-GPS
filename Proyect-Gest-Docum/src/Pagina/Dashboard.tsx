import type { IDocumento } from "../Interfaz/documento.interfaz";
import { DocumentoStatus } from "../Interfaz/documento.interfaz";
import { FileText, Clock, CheckCircle, Plus } from "lucide-react"; // Iconos

export const Dashboard = () => {
  const documents: IDocumento[] = [
    {
      id: "1",
      title: "Especificación de Requerimientos v2.pdf",
      author: "Ana Gómez",
      version: "v2.0",
      status: DocumentoStatus.Approved,
      updatedAt: new Date(),
      // ... más campos
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR - Panel Izquierdo */}
      <aside className="w-64 bg-white border-r p-6">
        <h2 className="text-xl font-bold mb-8">GEST-DOCUM</h2>
        <nav className="space-y-4">
          <button className="flex items-center gap-2 text-green-600 font-semibold">
            <Plus size={20} /> Nuevo Documento
          </button>
          {/* Aquí irían tus links de navegación */}
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Panel de Gestión Documental</h1>
        </header>

        {/* TABLA DE DOCUMENTOS */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Versión</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Última Modificación</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 flex items-center gap-2">
                    <FileText size={18} className="text-red-500" />
                    {doc.title}
                  </td>
                  <td className="p-4">{doc.version}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {doc.updatedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
