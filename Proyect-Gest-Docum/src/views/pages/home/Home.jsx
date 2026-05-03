import React, { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CLink,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPopover,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilFolderOpen,
  cilLibrary,
  cilSearch,
  cilTag,
  cilPlus,
} from '@coreui/icons'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const actionButtons = [
  { label: 'New Set', type: 'set' },
  { label: 'Add Folder', type: 'folder' },
  { label: 'Add Document', type: 'document' },
]

const Home = () => {
  const dispatch = useDispatch()
  const [sets, setSets] = useState([])
  const [folders, setFolders] = useState([])
  const [documents, setDocuments] = useState([])
  const [tags, setTags] = useState([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [openTagPopoverDocId, setOpenTagPopoverDocId] = useState(null)
  const [currentLocation, setCurrentLocation] = useState({ type: 'root', id: null })
  const [selected, setSelected] = useState({ type: null, id: null })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedUploadFile, setSelectedUploadFile] = useState(null)
  const fileInputRef = useRef(null)

  const authToken = localStorage.getItem('authToken')
  const location = useLocation()

  const selectedFolder = useMemo(
    () => folders.find((folder) => String(folder._id) === String(selected.id)),
    [folders, selected],
  )

  const selectedDocument = useMemo(
    () => documents.find((doc) => String(doc._id) === String(selected.id)),
    [documents, selected],
  )

  const currentSet = useMemo(() => {
    if (currentLocation.type === 'set') {
      return sets.find((setItem) => String(setItem._id) === String(currentLocation.id))
    }
    if (currentLocation.type === 'folder') {
      const folder = folders.find((folderItem) => String(folderItem._id) === String(currentLocation.id))
      return folder ? sets.find((setItem) => String(setItem._id) === String(folder.setId)) : null
    }
    return null
  }, [currentLocation, folders, sets])

  const currentFolder = useMemo(() => {
    if (currentLocation.type === 'folder') {
      return folders.find((folder) => String(folder._id) === String(currentLocation.id))
    }
    return null
  }, [currentLocation, folders])

  const currentLocationInfo = useMemo(() => {
    if (currentLocation.type === 'set') return { setId: currentLocation.id, folderId: null }
    if (currentLocation.type === 'folder' && currentFolder) {
      return { setId: currentFolder.setId || null, folderId: currentFolder._id }
    }
    return null
  }, [currentLocation, currentFolder])

  const fetchData = async () => {
    if (!authToken) return
    setLoading(true)
    setMessage('')

    try {
      const [setsRes, foldersRes, docsRes] = await Promise.all([
        fetch(`${apiBase}/api/user/sets`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${apiBase}/api/user/folders`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${apiBase}/api/user/documents`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ])

      const [setsData, foldersData, docsData] = await Promise.all([
        setsRes.json(),
        foldersRes.json(),
        docsRes.json(),
      ])

      setSets(Array.isArray(setsData.data) ? setsData.data : [])
      setFolders(Array.isArray(foldersData.data) ? foldersData.data : [])
      setDocuments(Array.isArray(docsData.data) ? docsData.data : [])
    } catch (error) {
      setMessage('Unable to load home list data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    if (!authToken) return
    setLoadingTags(true)
    try {
      const response = await fetch(`${apiBase}/api/user/tags`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (response.ok) {
        setTags(Array.isArray(result.data) ? result.data : [])
      } else {
        setMessage(result.message || 'Unable to load tags.')
      }
    } catch (error) {
      setMessage('Unable to load tags.')
    } finally {
      setLoadingTags(false)
    }
  }

  const handleToggleDocumentTag = async (doc, tagId) => {
    if (!authToken) return
    const currentTags = Array.isArray(doc.tags) ? doc.tags.map(String) : []
    const normalizedTagId = String(tagId)
    const updatedTags = currentTags.includes(normalizedTagId)
      ? currentTags.filter((id) => id !== normalizedTagId)
      : [...currentTags, normalizedTagId]

    try {
      const response = await fetch(`${apiBase}/api/user/documents/${doc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tags: updatedTags }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.message || 'Unable to update document tags.')
        return
      }
      setDocuments((previous) =>
        previous.map((item) =>
          String(item._id) === String(doc._id) ? { ...item, tags: updatedTags } : item,
        ),
      )
      setMessage('Document tags updated.')
    } catch (error) {
      setMessage('Unable to update document tags.')
    }
  }

  const renderTagPopover = (doc) => {
    const activeTagIds = Array.isArray(doc.tags) ? doc.tags.map(String) : []
    const isVisible = openTagPopoverDocId === String(doc._id)
    return (
      <CPopover
        trigger="click"
        placement="bottom"
        visible={isVisible}
        onHide={() => setOpenTagPopoverDocId(null)}
        content={
          <div className="document-tag-popover bg-body rounded-3 border-body-secondary" style={{ minWidth: '240px' }}>
            <div className="mb-3">
              <CLink href="/#/options" className="text-decoration-none">
                + Manage tags
              </CLink>
            </div>
            {loadingTags ? (
              <div className="text-body-secondary">Loading tags...</div>
            ) : tags.length === 0 ? (
              <div className="text-muted">No tags yet. Add one in Options.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {tags.map((tag) => {
                  const checked = activeTagIds.includes(String(tag._id))
                  return (
                    <label
                      htmlFor={`tag-toggle-${doc._id}-${tag._id}`}
                      key={String(tag._id)}
                      className="d-flex align-items-center justify-content-between rounded-3 p-2 bg-body border border-body-secondary"
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: tag.color || '#0d6efd',
                            display: 'inline-block',
                          }}
                        />
                        <span>{tag.name}</span>
                      </span>
                      <input
                        id={`tag-toggle-${doc._id}-${tag._id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          event.stopPropagation()
                          handleToggleDocumentTag(doc, tag._id)
                        }}
                      />
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        }
      >
        <CButton
          size="sm"
          color="secondary"
          className="rounded-pill px-3 document-tag-trigger"
          onClick={(event) => {
            event.stopPropagation()
            setOpenTagPopoverDocId((current) =>
              current === String(doc._id) ? null : String(doc._id),
            )
          }}
        >
          Tag
        </CButton>
      </CPopover>
    )
  }

  useEffect(() => {
    fetchData()
    fetchTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  useEffect(() => {
    const search = location.search || window.location.href.split('?')[1] || ''
    const query = new URLSearchParams(search)
    const setId = query.get('setId')

    if (setId) {
      const setItem = sets.find((item) => String(item._id) === String(setId))
      if (setItem) {
        setCurrentLocation({ type: 'set', id: setId })
        setSelected({ type: 'set', id: setId })
        return
      }
    }

    if (location.pathname === '/' || location.hash?.startsWith('#/')) {
      setCurrentLocation({ type: 'root', id: null })
      setSelected({ type: null, id: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, sets])

  useEffect(() => {
    if (!openTagPopoverDocId) {
      return undefined
    }

    const handleDocumentClick = (event) => {
      if (
        event.target.closest('.document-tag-popover') ||
        event.target.closest('.document-tag-trigger')
      ) {
        return
      }
      setOpenTagPopoverDocId(null)
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  }, [openTagPopoverDocId])

  const navigateTo = (type, item) => {
    setCurrentLocation({ type, id: item._id })
    setSelected({ type, id: item._id })
    setMessage('')
  }

  const downloadDocument = async (doc) => {
    if (!authToken) {
      setMessage('You must be logged in to download documents.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/user/documents/${doc._id}/download`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        const result = await response.json()
        setMessage(result.message || 'Unable to download document.')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.title || doc.file?.originalName || 'document'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage('Unable to download document. Please try again.')
    }
  }

  const handleSelectDocument = (doc) => {
    if (selected.type === 'document' && String(selected.id) === String(doc._id)) {
      downloadDocument(doc)
      return
    }
    setSelected({ type: 'document', id: doc._id })
    setMessage('')
  }

  const shareItem = async (type, item) => {
    if (!authToken) {
      setMessage('You must be logged in to share items.')
      return
    }

    const targetEmail = window.prompt(`Share this ${type} with (user email):`)
    if (!targetEmail || !targetEmail.trim()) {
      return
    }

    const endpointMap = {
      set: `/api/user/sets/${item._id}/share`,
      folder: `/api/user/folders/${item._id}/share`,
      document: `/api/user/documents/${item._id}/share`,
    }
    const endpoint = endpointMap[type]
    if (!endpoint) {
      setMessage(`Unable to share ${type}.`)
      return
    }

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetEmail: targetEmail.trim() }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.message || `Unable to share ${type}.`)
        return
      }
      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} shared with ${targetEmail.trim()}.`)
    } catch (error) {
      setMessage(`Unable to share ${type}. Please try again.`)
    }
  }

  const moreActions = (type, item) => {
    setMessage(`More actions for ${type} '${item.title}' coming soon.`)
  }

  const renderItemActions = (type, item) => (
    <div className="d-flex justify-content-end gap-2 w-50">
      <CButton
        size="sm"
        color="secondary"
        className="rounded-pill px-3"
        onClick={(event) => {
          event.stopPropagation()
          shareItem(type, item)
        }}
      >
        Share
      </CButton>
      {type === 'document' ? (
        renderTagPopover(item)
      ) : (
        <CButton
          size="sm"
          color="secondary"
          className="rounded-pill px-3"
          onClick={(event) => {
            event.stopPropagation()
            setMessage('Tagging is only available for documents.')
          }}
        >
          Tag
        </CButton>
      )}
      <CButton
        size="sm"
        color="secondary"
        className="rounded-pill px-3"
        onClick={(event) => {
          event.stopPropagation()
          moreActions(type, item)
        }}
      >
        ⋯
      </CButton>
    </div>
  )

  const createItem = async (type) => {
    setMessage('')
    const title = window.prompt(`Name your new ${type}`)
    if (!title || !title.trim()) {
      return
    }

    if (!authToken) {
      setMessage('You must be logged in to create items.')
      return
    }

    const context = currentLocationInfo
    let endpoint = ''
    let body = { title: title.trim() }

    if (type === 'set') {
      endpoint = '/api/user/sets'
    }

    if (type === 'folder') {
      if (!currentLocationInfo || !currentLocationInfo.setId) {
        setMessage('Select a set or a folder inside a set before adding a new folder.')
        return
      }
      endpoint = '/api/user/folders'
      body.setId = currentLocationInfo.setId
    }

    if (type === 'document') {
      if (!currentLocationInfo) {
        setMessage('Select a set, folder, or document before adding a new document.')
        return
      }
      endpoint = '/api/user/documents'
      body.folderId = currentLocationInfo.folderId
      body.setId = currentLocationInfo.setId
      body.tags = []
    }

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.message || `Unable to create ${type}.`)
        return
      }
      fetchData()
      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully.`)
    } catch (error) {
      setMessage(`Unable to create ${type}. Please try again.`)
    }
  }

  const handleOpenDocumentUploadModal = () => {
    if (!currentLocationInfo) {
      setMessage('Select a set or folder before adding a new document.')
      return
    }
    setMessage('')
    setSelectedUploadFile(null)
    setDragActive(false)
    setShowDocumentUploadModal(true)
  }

  const handleCloseDocumentUploadModal = () => {
    setShowDocumentUploadModal(false)
    setDragActive(false)
    setSelectedUploadFile(null)
  }

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedUploadFile(file)
      setMessage('')
    }
  }

  const handleDocumentDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) {
      setSelectedUploadFile(file)
      setMessage('')
    }
  }

  const handleDocumentDragOver = (event) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDocumentDragLeave = () => {
    setDragActive(false)
  }

  const handleUploadDocument = async () => {
    if (!selectedUploadFile) {
      setMessage('Please select a file before uploading.')
      return
    }
    if (!authToken) {
      setMessage('You must be logged in to upload files.')
      return
    }
    if (!currentLocationInfo) {
      setMessage('Select a set or folder before uploading a document.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedUploadFile)
    formData.append('title', selectedUploadFile.name)
    if (currentLocationInfo.folderId) {
      formData.append('folderId', currentLocationInfo.folderId)
    }
    if (currentLocationInfo.setId) {
      formData.append('setId', currentLocationInfo.setId)
    }

    try {
      const response = await fetch(`${apiBase}/api/user/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.message || 'Unable to upload document.')
        return
      }
      fetchData()
      setMessage(`Document '${selectedUploadFile.name}' uploaded successfully.`)
      handleCloseDocumentUploadModal()
    } catch (error) {
      setMessage('Unable to upload document. Please try again.')
    }
  }

  const foldersBySet = useMemo(() => {
    return folders.reduce((acc, folder) => {
      const key = folder.setId ? String(folder.setId) : 'unassigned'
      acc[key] = acc[key] || []
      acc[key].push(folder)
      return acc
    }, {})
  }, [folders])

  const docsByFolder = useMemo(() => {
    return documents.reduce((acc, doc) => {
      const key = doc.folderId ? String(doc.folderId) : 'unassigned'
      acc[key] = acc[key] || []
      acc[key].push(doc)
      return acc
    }, {})
  }, [documents])

  const docsBySet = useMemo(() => {
    return documents.reduce((acc, doc) => {
      const key = doc.setId ? String(doc.setId) : 'unassigned'
      acc[key] = acc[key] || []
      acc[key].push(doc)
      return acc
    }, {})
  }, [documents])

  const currentBreadcrumb = useMemo(() => {
    const crumbs = [{ label: 'Home', type: 'root', id: null }]
    if (currentSet) {
      crumbs.push({ label: currentSet.title, type: 'set', id: currentSet._id })
    }
    if (currentFolder) {
      crumbs.push({ label: currentFolder.title, type: 'folder', id: currentFolder._id })
    }
    return crumbs
  }, [currentSet, currentFolder])

  const navigateToLocation = (type, id) => {
    if (type === 'root') {
      setCurrentLocation({ type: 'root', id: null })
      setSelected({ type: null, id: null })
    } else if (type === 'set') {
      const setItem = sets.find((item) => String(item._id) === String(id))
      if (setItem) {
        setCurrentLocation({ type: 'set', id })
        setSelected({ type: 'set', id })
      }
    } else if (type === 'folder') {
      const folderItem = folders.find((item) => String(item._id) === String(id))
      if (folderItem) {
        setCurrentLocation({ type: 'folder', id })
        setSelected({ type: 'folder', id })
      }
    }
    setMessage('')
  }

  const handleGoBack = () => {
    if (currentLocation.type === 'folder' && currentFolder) {
      navigateToLocation('set', currentFolder.setId)
    } else if (currentLocation.type === 'set') {
      navigateToLocation('root', null)
    }
  }

  return (
    <CRow className="mb-4">
      <CCol>
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
          <div>
            <h1 className="display-6 mb-0">
              {currentBreadcrumb.map((crumb, index) => (
                <span key={`${crumb.type}-${crumb.id || 'root'}`}> 
                  {index > 0 && <span className="text-body-secondary">/</span>}{' '}
                  <CLink
                    href="#"
                    className="text-decoration-none"
                    onClick={(event) => {
                      event.preventDefault()
                      navigateToLocation(crumb.type, crumb.id)
                    }}
                  >
                    {crumb.label}
                  </CLink>
                </span>
              ))}
            </h1>
            <div className="text-body-secondary">Browse the current level and drill deeper by opening sets or folders.</div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {actionButtons.map((action) => (
              <CButton
                key={action.type}
                color="primary"
                size="sm"
                className="rounded-pill px-3"
                onClick={() =>
                  action.type === 'document'
                    ? handleOpenDocumentUploadModal()
                    : createItem(action.type)
                }
              >
                <CIcon icon={cilPlus} className="me-2" />
                {action.label}
              </CButton>
            ))}
          </div>
        </div>

        {currentLocation.type !== 'root' && (
          <div className="mb-4">
            <CButton color="secondary" size="sm" className="rounded-pill px-3" onClick={handleGoBack}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>
          </div>
        )}

        <CInputGroup className="mb-4 rounded-pill overflow-hidden border border-1 border-body-secondary">
          <CInputGroupText className="bg-body-secondary border-0 text-body-secondary">
            <CIcon icon={cilSearch} />
          </CInputGroupText>
          <CFormInput placeholder="Search Document" className="border-0" disabled />
        </CInputGroup>

        {message && (
          <div className="alert alert-info rounded-4 px-4 py-3">{message}</div>
        )}

        <CModal visible={showDocumentUploadModal} size="lg" onClose={handleCloseDocumentUploadModal} backdrop="static">
          <CModalHeader>
            <CModalTitle>Upload a Document</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="mb-4 text-body-secondary">
              Drag a file into the area below, or choose one from your computer.
            </div>
            <div
              className={`rounded-4 border border-2 p-4 text-center ${
                dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-body-secondary'
              }`}
              style={{ minHeight: '200px', cursor: 'pointer' }}
              onDragOver={handleDocumentDragOver}
              onDragLeave={handleDocumentDragLeave}
              onDrop={handleDocumentDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-100 d-flex flex-column align-items-center justify-content-center gap-3">
                <div className="fw-semibold">Drop a file here</div>
                <div className="text-body-secondary">or</div>
                <CButton color="secondary" size="sm" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click() }}>
                  Choose a file
                </CButton>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  onChange={handleFileInputChange}
                />
                {selectedUploadFile ? (
                  <div className="text-body-secondary small">Selected file: {selectedUploadFile.name}</div>
                ) : (
                  <div className="text-body-secondary small">Work in progress</div>
                )}
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseDocumentUploadModal}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleUploadDocument}>
              Upload document
            </CButton>
          </CModalFooter>
        </CModal>

        <CCard className="bg-body-secondary rounded-4 p-4">
          <CCardBody>
            {loading ? (
              <div className="text-center text-body-secondary">Loading your document structure...</div>
            ) : sets.length === 0 ? (
              <div className="text-center text-body-secondary">No sets yet. Create your first set to start organizing folders and documents.</div>
            ) : (
              <ul className="list-unstyled mb-0">
                {currentLocation.type === 'root' &&
                  sets.map((setItem) => (
                    <li key={setItem._id} className="mb-4">
                      <div
                        className={`d-flex align-items-center mb-3 p-3 rounded-3 bg-primary text-white`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigateToLocation('set', setItem._id)}
                      >
                        <div className="d-flex align-items-center gap-2 w-50">
                          <CIcon icon={cilLibrary} className="fs-4" />
                          <span className="h6 mb-0">{setItem.title}</span>
                        </div>
                        {renderItemActions('set', setItem)}
                      </div>
                    </li>
                  ))}

                {currentLocation.type === 'set' && currentSet && (
                  <>
                    {((foldersBySet[String(currentSet._id)] || []).length > 0 ||
                      (docsBySet[String(currentSet._id)] || []).filter((doc) => !doc.folderId).length > 0) ? (
                      <>
                        {(foldersBySet[String(currentSet._id)] || []).map((folder) => (
                          <div key={folder._id} className="mb-3">
                            <div
                              className={`d-flex align-items-center p-3 rounded-3 ${
                                selected.type === 'folder' && String(selected.id) === String(folder._id)
                                  ? 'bg-primary text-white'
                                  : 'bg-body border border-body-secondary'
                              }`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigateToLocation('folder', folder._id)}
                            >
                              <div className="d-flex align-items-center gap-2 w-50">
                                <CIcon icon={cilFolderOpen} className="fs-5" />
                                <span>{folder.title}</span>
                              </div>
                              {renderItemActions('folder', folder)}
                            </div>
                          </div>
                        ))}
                        {(docsBySet[String(currentSet._id)] || [])
                          .filter((doc) => !doc.folderId)
                          .map((doc) => (
                            <div
                              key={doc._id}
                              className={`d-flex align-items-center p-3 rounded-3 mb-2 ${
                                selected.type === 'document' && String(selected.id) === String(doc._id)
                                  ? 'bg-primary text-white'
                                  : 'bg-body border border-body-secondary'
                              }`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleSelectDocument(doc)}
                            >
                              <div className="w-50">{doc.title}</div>
                              {renderItemActions('document', doc)}
                            </div>
                          ))}
                      </>
                    ) : (
                      <div className="text-body-secondary">No folders or documents available in this set.</div>
                    )}
                  </>
                )}

                {currentLocation.type === 'folder' && currentFolder && (
                  <>
                    {(docsByFolder[String(currentFolder._id)] || []).length > 0 ? (
                      (docsByFolder[String(currentFolder._id)] || []).map((doc) => (
                        <div
                          key={doc._id}
                          className={`d-flex align-items-center p-3 rounded-3 mb-2 ${
                            selected.type === 'document' && String(selected.id) === String(doc._id)
                              ? 'bg-primary text-white'
                              : 'bg-body border border-body-secondary'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSelectDocument(doc)}
                        >
                          <div className="w-50">{doc.title}</div>
                          {renderItemActions('document', doc)}
                        </div>
                      ))
                    ) : (
                      <div className="text-body-secondary">No documents available in this folder.</div>
                    )}
                  </>
                )}
              </ul>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

Home.propTypes = {}

export default Home
