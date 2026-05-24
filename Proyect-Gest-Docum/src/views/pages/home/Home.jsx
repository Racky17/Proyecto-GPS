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
  cilFile,
  cilFolderOpen,
  cilLibrary,
  cilSearch,
  cilTag,
  cilPlus,
} from '@coreui/icons'
import { useLanguage } from '../../../i18n'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const Home = () => {
  const dispatch = useDispatch()
  const { t } = useLanguage()
  const actionButtons = useMemo(
    () => [
      { label: t('home_newSet'), type: 'set' },
      { label: t('home_newFolder'), type: 'folder' },
      { label: t('home_newDoc'), type: 'document' },
    ],
    [t],
  )
  const [sets, setSets] = useState([])
  const [folders, setFolders] = useState([])
  const [documents, setDocuments] = useState([])
  const [tags, setTags] = useState([])
  const [documentUserTags, setDocumentUserTags] = useState({}) // { documentId: [tagIds] }
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

  // Search state and dropdown
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef(null)

  const authToken = localStorage.getItem('authToken')
  const authUser = JSON.parse(localStorage.getItem('authUser') || 'null')
  const userIdFromStorage = authUser
    ? String(authUser.id ?? authUser._id ?? authUser.userId ?? authUser.uid ?? '')
    : null
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
      const loadedDocs = Array.isArray(docsData.data) ? docsData.data : []
      setDocuments(loadedDocs)
      fetchUserDocumentTags(loadedDocs)
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

  const fetchUserDocumentTags = async (docs) => {
    if (!authToken || !Array.isArray(docs) || docs.length === 0) return
    try {
      const tagPromises = docs.map((doc) =>
        fetch(`${apiBase}/api/user/documents/${doc._id}/my-tags`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
          .then((res) => res.json())
          .then((result) => ({ docId: doc._id, tags: result.data || [] }))
          .catch(() => ({ docId: doc._id, tags: [] })),
      )
      const results = await Promise.all(tagPromises)
      const tagsMap = {}
      results.forEach(({ docId, tags }) => {
        tagsMap[docId] = tags
      })
      setDocumentUserTags(tagsMap)
    } catch (error) {
      // silently fail
    }
  }

  const handleToggleDocumentTag = async (doc, tagId) => {
    if (!authToken) return
    const currentTags = Array.isArray(documentUserTags[doc._id]) ? documentUserTags[doc._id].map(String) : []
    const normalizedTagId = String(tagId)
    const updatedTags = currentTags.includes(normalizedTagId)
      ? currentTags.filter((id) => id !== normalizedTagId)
      : [...currentTags, normalizedTagId]

    try {
      const response = await fetch(`${apiBase}/api/user/documents/${doc._id}/my-tags`, {
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
      setDocumentUserTags((prev) => ({
        ...prev,
        [doc._id]: updatedTags,
      }))
      setMessage('Document tags updated.')
    } catch (error) {
      setMessage('Unable to update document tags.')
    }
  }

  const renderTagPopover = (doc) => {
    const activeTagIds = Array.isArray(documentUserTags[doc._id]) ? documentUserTags[doc._id].map(String) : []
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
          {t('home_tagButton')}
        </CButton>
      </CPopover>
    )
  }

  const renderTagMarkers = (item) => {
    // For documents, use user-specific tags; for folders/sets, use document tags
    const itemTagIds = item._id && documentUserTags[item._id] 
      ? documentUserTags[item._id].map(String) 
      : (Array.isArray(item.tags) ? item.tags.map(String) : [])
    if (itemTagIds.length === 0 || tags.length === 0) {
      return null
    }

    const matchedTags = tags.filter((tag) => itemTagIds.includes(String(tag._id)))
    if (matchedTags.length === 0) {
      return null
    }

    return (
      <div className="d-flex flex-wrap gap-1 mt-3">
        {matchedTags.slice(0, 6).map((tag) => (
          <span
            key={tag._id}
            title={tag.name}
            className="rounded-circle border border-body-secondary"
            style={{
              width: '10px',
              height: '10px',
              backgroundColor: tag.color || '#0d6efd',
              display: 'inline-block',
            }}
          />
        ))}
        {matchedTags.length > 6 && (
          <span className="small text-body-secondary">+{matchedTags.length - 6}</span>
        )}
      </div>
    )
  }

  const renderItemActions = (type, item) => (
    <div className="d-flex flex-wrap gap-2 mt-3">
      <CButton
        size="sm"
        color="secondary"
        className="rounded-pill px-3"
        onClick={(event) => {
          event.stopPropagation()
          shareItem(type, item)
        }}
      >
        {t('home_shareButton')}
      </CButton>
      {type === 'document' ? renderTagPopover(item) : null}
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

  // Search filtering scoped to current location and its subdivisions
  useEffect(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      return
    }

    const results = []

    const pushSet = (setItem) => {
      results.push({ type: 'set', item: setItem, path: '' })
    }

    const pushFolder = (folder) => {
      const setItem = sets.find((s) => String(s._id) === String(folder.setId))
      const path = setItem ? String(setItem.title) : ''
      results.push({ type: 'folder', item: folder, path })
    }

    const pushDocument = (doc) => {
      const folder = folders.find((f) => String(f._id) === String(doc.folderId))
      const setItem = sets.find((s) => String(s._id) === String(doc.setId)) || (folder ? sets.find((s) => String(s._id) === String(folder.setId)) : null)
      const path = setItem ? (setItem.title + (folder ? ' / ' + folder.title : '')) : (folder ? folder.title : '')
      results.push({ type: 'document', item: doc, path })
    }

    if (currentLocation.type === 'root') {
      sets.forEach((s) => { if ((s.title || '').toLowerCase().includes(q)) pushSet(s) })
      folders.forEach((f) => { if ((f.title || '').toLowerCase().includes(q)) pushFolder(f) })
      documents.forEach((d) => { if ((d.title || '').toLowerCase().includes(q)) pushDocument(d) })
    } else if (currentLocation.type === 'set') {
      const setId = currentLocation.id
      folders.filter((f) => String(f.setId) === String(setId)).forEach((f) => { if ((f.title || '').toLowerCase().includes(q)) pushFolder(f) })
      documents.filter((d) => String(d.setId) === String(setId)).forEach((d) => { if ((d.title || '').toLowerCase().includes(q)) pushDocument(d) })
      // also match the set itself
      const setMatch = sets.find((s) => String(s._id) === String(setId))
      if (setMatch && (setMatch.title || '').toLowerCase().includes(q)) pushSet(setMatch)
    } else if (currentLocation.type === 'folder') {
      const folderId = currentLocation.id
      documents.filter((d) => String(d.folderId) === String(folderId)).forEach((d) => { if ((d.title || '').toLowerCase().includes(q)) pushDocument(d) })
      const folderMatch = folders.find((f) => String(f._id) === String(folderId))
      if (folderMatch && (folderMatch.title || '').toLowerCase().includes(q)) pushFolder(folderMatch)
    }

    setSearchResults(results.slice(0, 50))
    setShowSearchDropdown(results.length > 0)
  }, [searchQuery, currentLocation, sets, folders, documents])

  // Close search dropdown when clicking outside
  useEffect(() => {
    if (!showSearchDropdown) return undefined
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSearchDropdown])

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
    const crumbs = [{ label: t('home_home'), type: 'root', id: null }]
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

  const handleSearchSelect = (result) => {
    const { type, item } = result
    if (type === 'set') {
      navigateToLocation('set', item._id)
    } else if (type === 'folder') {
      navigateToLocation('folder', item._id)
    } else if (type === 'document') {
      if (item.folderId) {
        navigateToLocation('folder', item.folderId)
        setTimeout(() => setSelected({ type: 'document', id: item._id }), 50)
      } else if (item.setId) {
        navigateToLocation('set', item.setId)
        setTimeout(() => setSelected({ type: 'document', id: item._id }), 50)
      }
    }
    setSearchQuery('')
    setShowSearchDropdown(false)
  }

  // Helpers to highlight matched query text in results
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const getHighlightedText = (text) => {
    const q = (searchQuery || '').trim()
    if (!q) return text
    try {
      const parts = String(text).split(new RegExp(`(${escapeRegExp(q)})`, 'ig'))
      const qLower = q.toLowerCase()
      return parts.map((part, i) =>
        part.toLowerCase() === qLower ? (
          <mark key={i} className="bg-warning text-dark px-0">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )
    } catch (e) {
      return text
    }
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
            <div className="text-body-secondary">
              {t('home_topDesc')}
            </div>
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
              {t('home_backButton')}
            </CButton>
          </div>
        )}

        {/* Search (scoped to current location and subdivisions) */}
        <div className="position-relative mb-4" ref={searchRef}>
          <CInputGroup className="rounded-pill overflow-hidden border border-1 border-body-secondary">
            <CInputGroupText className="bg-body-secondary border-0 text-body-secondary">
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder={t('home_searchPlaceholder') || 'Search...'}
              className="border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchDropdown(searchResults.length > 0)}
            />
          </CInputGroup>

          {showSearchDropdown && searchResults.length > 0 && (
            <div className="position-absolute w-100 bg-body rounded-3 border border-body-secondary mt-1" style={{ zIndex: 2000 }}>
              {searchResults.map((res, idx) => (
                <div
                  key={`${res.type}-${String(res.item._id)}-${idx}`}
                  className="d-flex justify-content-between align-items-center px-3 py-2 search-result-item"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleSearchSelect(res) }}
                >
                  <div className="fw-semibold">{getHighlightedText(res.item.title || '')}</div>
                  <div className="text-body-secondary small">{res.path}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CModal visible={showDocumentUploadModal} size="lg" onClose={handleCloseDocumentUploadModal} backdrop="static">
          <CModalHeader>
            <CModalTitle>{t('home_uploadHeader')}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="mb-4 text-body-secondary">
              {t('home_uploadDesc')}
            </div>
            <div
              className={`rounded-4 border-2 p-4 text-center ${
                dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-body-secondary'
              }`}
              style={{ minHeight: '200px', cursor: 'pointer' }}
              onDragOver={handleDocumentDragOver}
              onDragLeave={handleDocumentDragLeave}
              onDrop={handleDocumentDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-100 d-flex flex-column align-items-center justify-content-center gap-3">
                <div className="fw-semibold">{t('home_uploadDropfile')}</div>
                <div className="text-body-secondary">{t('home_uploadOr')}</div>
                <CButton color="secondary" size="sm" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click() }}>
                  {t('home_uploadChoose')}
                </CButton>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  onChange={handleFileInputChange}
                />
                {selectedUploadFile ? (
                  <div className="text-body-secondary small">{t('home_uploadChosen')}{selectedUploadFile.name}</div>
                ) : (
                  <div className="text-body-secondary small">Work in progress</div>
                )}
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseDocumentUploadModal}>
              {t('home_cancel')}
            </CButton>
            <CButton color="primary" onClick={handleUploadDocument}>
              {t('home_uploadButton')}
            </CButton>
          </CModalFooter>
        </CModal>

        <CCard className="bg-body-secondary rounded-4 p-4 mb-4">
          <CCardBody>
            {loading ? (
              <div className="text-center text-body-secondary">{t('home_loading')}</div>
            ) : sets.length === 0 ? (
              <div className="text-center text-body-secondary">{t('home_emptySet')}</div>
            ) : (
              <>
                {currentLocation.type === 'root' && (
                  <CRow className="g-3">
                    {sets.map((setItem) => {
                      const isSelected = selected.type === 'set' && String(selected.id) === String(setItem._id)
                      return (
                        <CCol xs={12} sm={6} lg={4} key={setItem._id}>
                          <div
                            className={`h-100 d-flex flex-column p-3 rounded-4 ${
                              isSelected ? 'bg-primary text-white' : 'bg-primary text-white border border-body-secondary'
                            }`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigateToLocation('set', setItem._id)}
                          >
                            <div className="d-flex align-items-start gap-2 mb-3">
                              <CIcon icon={cilLibrary} className="fs-4" />
                              <div>
                                <div className="fw-semibold">{setItem.title}</div>
                                {renderTagMarkers(setItem)}
                              </div>
                            </div>
                            <div className="mt-auto">{renderItemActions('set', setItem)}</div>
                          </div>
                        </CCol>
                      )
                    })}
                  </CRow>
                )}

                {currentLocation.type === 'set' && currentSet && (
                  <>
                    {((foldersBySet[String(currentSet._id)] || []).length > 0 ||
                      (docsBySet[String(currentSet._id)] || []).filter((doc) => !doc.folderId).length > 0) ? (
                      <CRow className="g-3">
                        {(foldersBySet[String(currentSet._id)] || []).map((folder) => {
                          const isSelected = selected.type === 'folder' && String(selected.id) === String(folder._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={folder._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected ? 'bg-primary text-white' : 'bg-body border border-body-secondary'
                                }`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigateToLocation('folder', folder._id)}
                              >
                                <div className="d-flex align-items-start gap-2 mb-3">
                                  <CIcon icon={cilFolderOpen} className="fs-4" />
                                  <div>
                                    <div className="fw-semibold">{folder.title}</div>
                                    {renderTagMarkers(folder)}
                                  </div>
                                </div>
                                <div className="mt-auto">{renderItemActions('folder', folder)}</div>
                              </div>
                            </CCol>
                          )
                        })}
                        {(docsBySet[String(currentSet._id)] || [])
                          .filter((doc) => !doc.folderId)
                          .map((doc) => {
                            const isSelected = selected.type === 'document' && String(selected.id) === String(doc._id)
                            return (
                              <CCol xs={12} sm={6} lg={4} key={doc._id}>
                                <div
                                  className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                    isSelected ? 'bg-primary text-white' : 'bg-body border border-body-secondary'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleSelectDocument(doc)}
                                  onDoubleClick={() => downloadDocument(doc)}
                                >
                                  <div className="d-flex align-items-start gap-2 mb-3">
                                    <CIcon icon={cilFile} className="fs-4" />
                                    <div>
                                      <div className="fw-semibold">{doc.title}</div>
                                      {renderTagMarkers(doc)}
                                    </div>
                                  </div>
                                  <div className="mt-auto">{renderItemActions('document', doc)}</div>
                                </div>
                              </CCol>
                            )
                          })}
                      </CRow>
                    ) : (
                      <div className="text-body-secondary">{t('home_emptyFold')}</div>
                    )}
                  </>
                )}

                {currentLocation.type === 'folder' && currentFolder && (
                  <>
                    {(docsByFolder[String(currentFolder._id)] || []).length > 0 ? (
                      <CRow className="g-3">
                        {(docsByFolder[String(currentFolder._id)] || []).map((doc) => {
                          const isSelected = selected.type === 'document' && String(selected.id) === String(doc._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={doc._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected ? 'bg-primary text-white' : 'bg-body border border-body-secondary'
                                }`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelectDocument(doc)}
                                onDoubleClick={() => downloadDocument(doc)}
                              >
                                <div className="d-flex align-items-start gap-2 mb-3">
                                  <CIcon icon={cilFile} className="fs-4" />
                                  <div>
                                    <div className="fw-semibold">{doc.title}</div>
                                    {renderTagMarkers(doc)}
                                  </div>
                                </div>
                                <div className="mt-auto">{renderItemActions('document', doc)}</div>
                              </div>
                            </CCol>
                          )
                        })}
                      </CRow>
                    ) : (
                      <div className="text-body-secondary">{t('home_emptyFold2')}</div>
                    )}
                  </>
                )}
              </>
            )}
          </CCardBody>
        </CCard>

        {message && (
          <div className="alert alert-info rounded-4 px-4 py-3">{message}</div>
        )}
      </CCol>
    </CRow>
  )
}

Home.propTypes = {}

export default Home
