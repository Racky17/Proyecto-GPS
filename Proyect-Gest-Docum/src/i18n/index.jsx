import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'appLanguage'
const defaultLanguage = 'en'

const translations = {
  en: {
    opt_title: 'Options',
    opt_signeduser: 'Signed in as:',
    opt_unknownuser: 'Unknown user',
    opt_optionsdesc: 'Use this page to manage your account\'s details or logout.',
    opt_logout: 'Log out',
    opt_language: 'Language',
    opt_currentLanguage: 'Current language',
    opt_selectLanguage: 'Select your language',
    opt_english: 'English',
    opt_spanish: 'Spanish',
    opt_languageSaved: 'Language preference saved succesfully.',
    opt_manageTags: 'Manage Tags',
    opt_tagsYour: 'Your Tags',
    opt_tagsDesc: 'Create, edit, and delete tags for your documents. Tags are private to your account.',
    opt_tagsPlaceholder: 'Tag name',
    opt_tagsSave: 'Save Tag',
    opt_tagsCreate: 'Create Tag',
    opt_tagsCancel: 'Cancel',
    opt_tagsLoading: 'Loading tags...',
    opt_tagsEmpty: 'No tags yet. Add one to organize your documents.',
    opt_tagsEdit: 'Edit',
    opt_tagsDelete: 'Delete',

    sbar_user: 'User',
    sbar_userNotSigned: 'Not signed in',
    sbar_home: 'Home Screen',
    sbar_shared: 'Shared Files',
    sbar_recent: 'Recent Files',
    sbar_options: 'Configuration',
    sbar_sets: 'Document Sets',
    sbar_tags: 'Document Tags',
    sbar_org: 'Organizations',

    hder_light: 'Light',
    hder_dark: 'Dark',

    home_home: 'Home',
    home_topDesc: 'Group your project\'s documents within folders.',
    home_newSet: 'New Project',
    home_newFolder: 'Add Folder',
    home_newDoc: 'Add Document',
    home_backButton: 'Back',
    home_shareButton: 'Share',
    home_tagButton: 'Tag',
    home_shareText: 'Share this item with the following email:',
    home_tagText: '+ Manage tags',
    home_uploadHeader: 'Upload a Document',
    home_uploadDesc: 'Drag a file into the area below, or choose one from your computer.',
    home_uploadDropfile: 'Drop a file here',
    home_uploadOr: 'or',
    home_uploadChoose: 'Choose a file',
    home_uploadChosen: 'Chosen file: ',
    home_cancel: 'Cancel',
    home_uploadButton: 'Upload Document',
    home_loading: 'Loading your document structure...',
    home_emptySet: 'No projects yet. Create your first project to start organizing folders and documents.',
    home_emptyFold: 'No folders or documents available in this project.',
    home_emptyFold2: 'No documents available in this folder.',

    shar_title: 'Shared with me',
    shar_goBack: 'My Files',
    shar_desc: 'Documents shared with you by other users.',
    shar_from: 'From: ',
    shar_unknown: 'Unknown',
    shar_loading: 'Loading shared documents...',
    shar_noDocs: 'No documents have been shared with you yet.',

    org_title: 'Organizations',
    org_desc: 'Manage organizations and members',
    org_new: 'New Organization Name',
    org_create: 'Create Organization',
    org_yourOrgs: 'Your Organizations',
    org_loadingOrgs: 'Loading organizations...',
    org_noOrgs: 'You are not a member of any organizations yet.',
    org_owner: 'Owner: ',
    org_hide: 'Hide',
    org_manage: 'Manage',
    org_members: 'Members',
    org_membEmail: 'Member email or organization ID',
    org_selRole: 'Select role',
    org_add: 'Add',
  },
  es: {
    opt_title: 'Opciones',
    opt_signeduser: 'Ingresado como:',
    opt_unknownuser: 'Usuario desconocido',
    opt_optionsdesc: 'Utiliza esta página para administrar o salir de tu cuenta.',
    opt_logout: 'Salir de la cuenta actual',
    opt_language: 'Idioma',
    opt_currentLanguage: 'Idioma actual',
    opt_selectLanguage: 'Cambie su idioma',
    opt_english: 'Inglés',
    opt_spanish: 'Español',
    opt_languageSaved: 'Idioma cambiado correctamente.',
    opt_manageTags: 'Administrar Etiquetas',
    opt_tagsYour: 'Tus Etiquetas',
    opt_tagsDesc: 'Crea, cambia y elimina etiquetas para tus documentos. Cada etiqueta es solo asociada a tu cuenta.',
    opt_tagsPlaceholder: 'Nombra tu etiqueta',
    opt_tagsSave: 'Guardar Etiqueta',
    opt_tagsCreate: 'Crear Etiqueta',
    opt_tagsCancel: 'Cancelar',
    opt_tagsLoading: 'Cargando Etiquetas...',
    opt_tagsEmpty: 'Sin etiquetas. Crea una para organizar tus documentos.',
    opt_tagsEdit: 'Editar',
    opt_tagsDelete: 'Eliminar',

    sbar_user: 'Usuario',
    sbar_userNotSigned: 'Sin ingresar',
    sbar_home: 'Área Principal',
    sbar_shared: 'Archivos Compartidos',
    sbar_recent: 'Archivos Recientes',
    sbar_options: 'Configuración',
    sbar_sets: 'Proyectos',
    sbar_tags: 'Etiquetas',
    sbar_org: 'Organizaciones',

    hder_light: 'Claro',
    hder_dark: 'Oscuro',

    home_home: 'Home',
    home_topDesc: 'Agrupa documentos de proyectos en carpetas.',
    home_newSet: 'Nuevo Proyecto',
    home_newFolder: 'Añadir Carpeta',
    home_newDoc: 'Subir Documento',
    home_backButton: 'Volver',
    home_shareButton: 'Compartir',
    home_tagButton: 'Etiquetar',
    home_shareText: 'Compartir con el siguiente correo:',
    home_tagText: '+ Cambiar Etiquetas',
    home_uploadHeader: 'Subir Documento',
    home_uploadDesc: 'Arrastra un documento o elige uno desde tu PC.',
    home_uploadDropfile: 'Arrastra un archivo aquí',
    home_uploadOr: 'o',
    home_uploadChoose: 'Elige un archivo',
    home_uploadChosen: 'Documento elegido: ',
    home_cancel: 'Cancelar',
    home_uploadButton: 'Subir Documento',
    home_loading: 'Cargando tus documentos...',
    home_emptySet: 'Aún no hay proyectos. Crea tu primer proyecto para organizar carpetas y archivos.',
    home_emptyFold: 'Sin carpetas o archivos en este proyecto.',
    home_emptyFold2: 'Sin archivos en esta carpeta.',

    shar_title: 'Compartidos conmigo',
    shar_goBack: 'Mis Archivos',
    shar_desc: 'Documentos compartidos por otros usuarios.',
    shar_from: 'De: ',
    shar_unknown: 'Desconocido',
    shar_loading: 'Cargando documentos compartidos...',
    shar_noDocs: 'No documentos han sido compartidos contigo aún.',


    org_title: 'Organizaciones',
    org_desc: 'Administrar organizaciones y miembros',
    org_new: 'Nombre de nueva organización',
    org_create: 'Crear Organización',
    org_yourOrgs: 'Tus Organizaciones',
    org_loadingOrgs: 'Cargando organizaciones...',
    org_noOrgs: 'No eres miembro de organizaciones.',
    org_owner: 'Propietario: ',
    org_hide: 'Ver menos',
    org_manage: 'Ver detalles',
    org_members: 'Miembros',
    org_membEmail: 'Correo de miembro o ID de organización',
    org_selRole: 'Selecciona un rol',
    org_add: 'Agregar',
  },
}

const availableLanguages = [
  { code: 'en', label: translations.en.opt_english },
  { code: 'es', label: translations.es.opt_spanish },
]

const LanguageContext = createContext({
  language: defaultLanguage,
  setLanguage: () => {},
  t: (key) => key,
  availableLanguages,
})

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(defaultLanguage)

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
    if (storedLanguage === 'es' || storedLanguage === 'en') {
      setLanguageState(storedLanguage)
    }
  }, [])

  const setLanguage = (code) => {
    if (code !== 'en' && code !== 'es') {
      return
    }
    setLanguageState(code)
    window.localStorage.setItem(STORAGE_KEY, code)
  }

  const t = (key) => translations[language]?.[key] ?? key

  const value = useMemo(
    () => ({ language, setLanguage, t, availableLanguages }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
