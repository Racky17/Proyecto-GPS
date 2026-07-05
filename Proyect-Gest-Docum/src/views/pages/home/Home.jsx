import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CLink,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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

import ItemActions from './components/ItemActions'
import DeleteItemPopover from './components/DeleteItemPopover'
import DocumentTagPopover from './components/DocumentTagPopover'
import DocumentActionPopover from './components/DocumentActionPopover'
import RevisionHistoryModal from './components/RevisionHistoryModal'
import UploadDocumentModal from './components/UploadDocumentModal'
import ShareModal from './components/ShareModal'

const apiBase = import.meta.env.VITE_API_BASE_URL || ''

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
  const [openMoreActionsDocId, setOpenMoreActionsDocId] = useState(null)
  const [showDocumentUpdateModal, setShowDocumentUpdateModal] = useState(false)
  const [documentToUpdate, setDocumentToUpdate] = useState(null)
  const [selectedUpdateFile, setSelectedUpdateFile] = useState(null)
  const [updateDragActive, setUpdateDragActive] = useState(false)
  const updateFileInputRef = useRef(null)
  const [showRevisionHistoryModal, setShowRevisionHistoryModal] = useState(false)
  const [revisionHistoryLoading, setRevisionHistoryLoading] = useState(false)
  const [revisionHistoryError, setRevisionHistoryError] = useState('')
  const [revisionHistoryData, setRevisionHistoryData] = useState({
    versions: [],
    revisionHistory: [],
  })
  const [showCreateShareModal, setShowCreateShareModal] = useState(false)
  const [createItemType, setCreateItemType] = useState(null)
  const [createItemTitle, setCreateItemTitle] = useState('')
  const [createShareTargetEmail, setCreateShareTargetEmail] = useState('')
  const [createShareOrgId, setCreateShareOrgId] = useState('')
  const [createShareRole, setCreateShareRole] = useState('read-only')
  const [organizations, setOrganizations] = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [createModalError, setCreateModalError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareModalType, setShareModalType] = useState(null)
  const [shareModalItem, setShareModalItem] = useState(null)
  const [shareModalEmail, setShareModalEmail] = useState('')
  const [shareModalOrgId, setShareModalOrgId] = useState('')
  const [shareModalRole, setShareModalRole] = useState('read-only')
  const [shareModalError, setShareModalError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([])
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const lastSyncedLocationRef = useRef('')

  // Search state and dropdown
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState(null)
  const searchRef = useRef(null)

  const authToken = localStorage.getItem('authToken')
  const authUser = JSON.parse(localStorage.getItem('authUser') || 'null')
  const navigate = useNavigate()
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
      const folder = folders.find(
        (folderItem) => String(folderItem._id) === String(currentLocation.id),
      )
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

  const DOCUMENT_TAG_BATCH_SIZE = 50

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
      const documentIds = docs.map((doc) => String(doc._id)).filter(Boolean)
      const batches = []
      for (let index = 0; index < documentIds.length; index += DOCUMENT_TAG_BATCH_SIZE) {
        batches.push(documentIds.slice(index, index + DOCUMENT_TAG_BATCH_SIZE))
      }

      const tagsMap = {}
      for (const batch of batches) {
        const response = await fetch(`${apiBase}/api/user/documents/my-tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ documentIds: batch }),
        })
        const result = await response.json()
        if (!response.ok) {
          continue
        }

        Object.entries(result.data || {}).forEach(([docId, tags]) => {
          tagsMap[String(docId)] = Array.isArray(tags) ? tags.map(String) : []
        })
      }

      setDocumentUserTags(tagsMap)
    } catch (error) {
      // silently fail
    }
  }

  const handleToggleDocumentTag = async (doc, tagId) => {
    if (!authToken) return
    const currentTags = Array.isArray(documentUserTags[doc._id])
      ? documentUserTags[doc._id].map(String)
      : []
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

  const renderTagMarkers = (item) => {
    const itemTagIds =
      item._id && documentUserTags[item._id]
        ? documentUserTags[item._id].map(String)
        : Array.isArray(item.tags)
          ? item.tags.map(String)
          : []
    const matchedTags = tags.filter((tag) => itemTagIds.includes(String(tag._id)))
    if (!item || !item._id || (!item.pinnedAt && matchedTags.length === 0)) {
      return null
    }

    return (
      <div className="d-flex flex-wrap gap-1 mt-3 align-items-center">
        {item.pinnedAt && (
          <span className="rounded-pill border border-body-secondary px-2 py-1 small bg-warning text-dark">
            📌 {t('home_pinned')}
          </span>
        )}
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

  const selectedTag = useMemo(
    () => tags.find((tag) => String(tag._id) === String(selectedTagId)) || null,
    [selectedTagId, tags],
  )

  const documentMatchesSelectedTag = (doc) => {
    if (!selectedTagId) return true
    const itemTagIds = Array.isArray(documentUserTags[doc._id])
      ? documentUserTags[doc._id].map(String)
      : []
    return itemTagIds.includes(selectedTagId)
  }

  const getTaggedDocumentsForCurrentScope = () => {
    if (!selectedTagId) return []
    if (currentLocation.type === 'root') {
      return documents.filter((doc) => documentMatchesSelectedTag(doc) && doc.setId)
    }
    if (currentLocation.type === 'set' && currentSet) {
      return documents.filter(
        (doc) => String(doc.setId) === String(currentSet._id) && documentMatchesSelectedTag(doc),
      )
    }
    if (currentLocation.type === 'folder' && currentFolder) {
      return documents.filter(
        (doc) => String(doc.folderId) === String(currentFolder._id) && documentMatchesSelectedTag(doc),
      )
    }
    return []
  }

  const clearTagFilter = () => {
    const search = location.search || window.location.href.split('?')[1] || ''
    const params = new URLSearchParams(search)
    params.delete('tagId')
    const nextSearch = params.toString() ? `?${params.toString()}` : ''
    navigate(`${location.pathname}${nextSearch}`, { replace: true })
  }

  const sortByPinned = (items = []) => {
    return [...items].sort((a, b) => {
      const aPinned = Boolean(a?.pinnedAt)
      const bPinned = Boolean(b?.pinnedAt)
      if (aPinned !== bPinned) {
        return bPinned ? 1 : -1
      }
      if (aPinned && bPinned) {
        const aTime = new Date(a.pinnedAt).getTime() || 0
        const bTime = new Date(b.pinnedAt).getTime() || 0
        if (aTime !== bTime) return bTime - aTime
      }
      return String(a?.title || '').localeCompare(String(b?.title || ''))
    })
  }

  const collectDroppedFiles = async (dataTransfer) => {
    if (!dataTransfer) return []

    const items = Array.from(dataTransfer.items || [])
    if (items.length === 0) {
      return Array.from(dataTransfer.files || []).filter(Boolean)
    }

    const collectedFiles = []

    const readDirectoryEntries = async (directoryReader) => {
      return new Promise((resolve) => {
        directoryReader.readEntries(resolve)
      })
    }

    const walkEntry = async (entry, relativePath = '') => {
      if (!entry) return

      if (entry.isFile) {
        await new Promise((resolve) => {
          entry.file(
            (file) => {
              if (relativePath && !file.webkitRelativePath) {
                try {
                  Object.defineProperty(file, 'webkitRelativePath', {
                    value: `${relativePath}${file.name}`,
                  })
                } catch (error) {
                  // ignore read-only file implementations
                }
              }
              collectedFiles.push(file)
              resolve()
            },
            () => resolve(),
          )
        })
        return
      }

      if (entry.isDirectory) {
        const directoryReader = entry.createReader()
        const directoryPath = `${relativePath}${entry.name}/`

        while (true) {
          const entries = await readDirectoryEntries(directoryReader)
          if (!entries.length) break

          for (const childEntry of entries) {
            await walkEntry(childEntry, directoryPath)
          }
        }
      }
    }

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.()
      if (entry) {
        await walkEntry(entry)
      }
    }

    return collectedFiles.length ? collectedFiles : Array.from(dataTransfer.files || []).filter(Boolean)
  }

  const handleTogglePin = async (item, itemType = 'document') => {
    if (!authToken || !item || !item._id) return
    const endpoint = itemType === 'folder' ? `/api/user/folders/${item._id}/pin` : `/api/user/documents/${item._id}/pin`
    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pinned: !Boolean(item.pinnedAt) }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.message || 'Unable to update pin state.')
        return
      }
      if (itemType === 'folder') {
        setFolders((prev) => prev.map((folder) => (String(folder._id) === String(item._id) ? result.data : folder)))
      } else {
        setDocuments((prev) => prev.map((doc) => (String(doc._id) === String(item._id) ? result.data : doc)))
      }
      setMessage(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} pin state updated.`)
    } catch (error) {
      setMessage('Unable to update pin state. Please try again.')
    }
  }

  useEffect(() => {
    fetchData()
    fetchTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  useEffect(() => {
    const search = location.search || window.location.href.split('?')[1] || ''
    const syncKey = `${location.pathname}|${search}|${location.hash || ''}`
    if (lastSyncedLocationRef.current === syncKey) {
      return
    }
    lastSyncedLocationRef.current = syncKey

    const query = new URLSearchParams(search)
    const setId = query.get('setId')
    const tagId = query.get('tagId')

    setSelectedTagId(tagId ? String(tagId) : null)

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
  }, [location.key, location.pathname, location.search, location.hash, sets])

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
      const setItem =
        sets.find((s) => String(s._id) === String(doc.setId)) ||
        (folder ? sets.find((s) => String(s._id) === String(folder.setId)) : null)
      const path = setItem
        ? setItem.title + (folder ? ' / ' + folder.title : '')
        : folder
          ? folder.title
          : ''
      results.push({ type: 'document', item: doc, path })
    }

    if (currentLocation.type === 'root') {
      sets.forEach((s) => {
        if ((s.title || '').toLowerCase().includes(q)) pushSet(s)
      })
      folders.forEach((f) => {
        if ((f.title || '').toLowerCase().includes(q)) pushFolder(f)
      })
      documents.forEach((d) => {
        if ((d.title || '').toLowerCase().includes(q)) pushDocument(d)
      })
    } else if (currentLocation.type === 'set') {
      const setId = currentLocation.id
      folders
        .filter((f) => String(f.setId) === String(setId))
        .forEach((f) => {
          if ((f.title || '').toLowerCase().includes(q)) pushFolder(f)
        })
      documents
        .filter((d) => String(d.setId) === String(setId))
        .forEach((d) => {
          if ((d.title || '').toLowerCase().includes(q)) pushDocument(d)
        })
      // also match the set itself
      const setMatch = sets.find((s) => String(s._id) === String(setId))
      if (setMatch && (setMatch.title || '').toLowerCase().includes(q)) pushSet(setMatch)
    } else if (currentLocation.type === 'folder') {
      const folderId = currentLocation.id
      documents
        .filter((d) => String(d.folderId) === String(folderId))
        .forEach((d) => {
          if ((d.title || '').toLowerCase().includes(q)) pushDocument(d)
        })
      const folderMatch = folders.find((f) => String(f._id) === String(folderId))
      if (folderMatch && (folderMatch.title || '').toLowerCase().includes(q))
        pushFolder(folderMatch)
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

  const getOwnerLabel = (item) => {
    const ownerId = item?.ownerId || item?.userId || item?.createdBy || null
    const currentUserId = authUser
      ? String(authUser.id || authUser._id || authUser.userId || authUser.uid || '')
      : ''
    if (!ownerId) return 'Unknown owner'
    if (String(ownerId) === currentUserId) return 'You'
    return String(ownerId)
  }

  const openShareModal = (type, item) => {
    setShareModalType(type)
    setShareModalItem(item)
    setShareModalEmail('')
    setShareModalOrgId('')
    setShareModalRole('read-only')
    setShareModalError('')
    setMessage('')
    setShowShareModal(true)
    fetchOrganizations()
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setShareModalType(null)
    setShareModalItem(null)
    setShareModalError('')
  }

  const getShareEndpoint = (type, itemId) => {
    if (type === 'set') return `/api/user/sets/${itemId}/share`
    if (type === 'folder') return `/api/user/folders/${itemId}/share`
    if (type === 'document') return `/api/user/documents/${itemId}/share`
    return null
  }

  const normalizeSharedWithEntries = (sharedWith) => {
    if (!Array.isArray(sharedWith)) return []
    return sharedWith
      .map((entry) => {
        if (!entry) return null
        if (typeof entry === 'string' || typeof entry === 'number') {
          return { type: 'user', userId: String(entry) }
        }
        if (entry.userId) {
          return {
            type: 'user',
            userId: String(entry.userId),
            role: entry.role,
            email: entry.email || null,
            name: entry.name || null,
          }
        }
        if (entry.orgId) {
          return {
            type: 'org',
            orgId: String(entry.orgId),
            role: entry.role,
            name: entry.name || null,
          }
        }
        return null
      })
      .filter(Boolean)
  }

  const getShareEntries = (item) => {
    if (!item) return []
    const currentUserId = userIdFromStorage
    return normalizeSharedWithEntries(item.sharedWith).map((entry) => {
      if (entry.type === 'user') {
        const userId = String(entry.userId || '')
        const ownerLabel = userId === currentUserId ? 'You' : entry.name || entry.email || userId
        const details = entry.role ? `${ownerLabel} (${entry.role})` : ownerLabel
        return { ...entry, id: userId, label: details }
      }

      if (entry.type === 'org') {
        const orgId = String(entry.orgId || '')
        const org = organizations.find((orgItem) => String(orgItem._id) === orgId)
        const orgLabel = entry.name || org?.name || org?.title || orgId
        const details = entry.role ? `${orgLabel} (${entry.role})` : orgLabel
        return { ...entry, id: orgId, label: details }
      }

      return {
        type: 'unknown',
        id: String(entry?.userId || entry?.orgId || ''),
        label: String(entry?.name || entry?.email || entry?.id || 'Unknown'),
      }
    })
  }

  const canManageShareEntries = (item) => {
    if (!item || !userIdFromStorage) return false
    const ownerId = String(item.ownerId || item.userId || '')
    return ownerId === userIdFromStorage
  }

  const handleRemoveShare = async (entry) => {
    if (!authToken || !shareModalItem || !entry) {
      setShareModalError('Unable to remove share entry.')
      return
    }

    const endpoint = getShareEndpoint(shareModalType, shareModalItem._id)
    if (!endpoint) {
      setShareModalError('Unable to remove share entry.')
      return
    }

    const body =
      entry.type === 'user'
        ? { targetUserId: String(entry.userId) }
        : { targetOrgId: String(entry.orgId) }

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Unable to remove share entry.')
      }

      setShareModalItem((prevItem) => {
        if (!prevItem) return prevItem
        const updatedSharedWith = normalizeSharedWithEntries(prevItem.sharedWith).filter(
          (existing) => {
            if (entry.type === 'user') {
              return String(existing.userId) !== String(entry.userId)
            }
            if (entry.type === 'org') {
              return String(existing.orgId) !== String(entry.orgId)
            }
            return true
          },
        )
        return {
          ...prevItem,
          sharedWith: updatedSharedWith,
        }
      })
      await fetchData()
      setMessage('Share access removed successfully.')
    } catch (error) {
      setShareModalError(error.message || 'Unable to remove share entry.')
    }
  }

  const shareItemByEmail = async (itemId, type, email, roleParam) => {
    const endpoint = getShareEndpoint(type, itemId)
    if (!endpoint) {
      throw new Error(`Unable to share ${type}.`)
    }
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ targetEmail: email.trim(), role: roleParam || shareModalRole }),
    })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.message || `Unable to share ${type} with ${email}.`)
    }
    return email.trim()
  }

  const handleShareSubmit = async () => {
    setShareModalError('')
    setMessage('')
    if (!authToken) {
      setShareModalError('You must be logged in to share items.')
      return
    }
    if (!shareModalItem) {
      setShareModalError('No item selected.')
      return
    }
    if (!shareModalEmail.trim() && !shareModalOrgId) {
      setShareModalError('Enter an email or choose an organization to share with.')
      return
    }

    try {
      const sharedParts = []
      if (shareModalEmail.trim()) {
        await shareItemByEmail(
          shareModalItem._id,
          shareModalType,
          shareModalEmail.trim(),
          shareModalRole,
        )
        sharedParts.push(`user ${shareModalEmail.trim()}`)
      }
      if (shareModalOrgId) {
        const endpoint = getShareEndpoint(shareModalType, shareModalItem._id)
        const resp = await fetch(`${apiBase}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ targetOrgId: shareModalOrgId, role: shareModalRole }),
        })
        const r = await resp.json()
        if (!resp.ok) throw new Error(r.message || 'Unable to share organization')
        sharedParts.push(`organization ${shareModalOrgId}`)
      }
      await fetchData()
      setMessage(
        `${shareModalType.charAt(0).toUpperCase() + shareModalType.slice(1)} shared successfully.` +
          (sharedParts.length > 0 ? ` Shared with ${sharedParts.join(' and ')}.` : ''),
      )
      closeShareModal()
    } catch (error) {
      setShareModalError(error.message || 'Unable to share item.')
    }
  }

  const fetchOrganizations = async () => {
    if (!authToken) {
      setOrganizations([])
      return
    }
    setLoadingOrgs(true)
    try {
      const response = await fetch(`${apiBase}/api/organizations`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        setOrganizations([])
        return
      }
      setOrganizations(Array.isArray(result.data) ? result.data : [])
    } catch (error) {
      setOrganizations([])
    } finally {
      setLoadingOrgs(false)
    }
  }

  const openCreateShareModal = async (type) => {
    if (type === 'folder' && (!currentLocationInfo || !currentLocationInfo.setId)) {
      setMessage('Select a set or a folder inside a set before adding a new folder.')
      return
    }
    setCreateItemType(type)
    setCreateItemTitle('')
    setCreateShareTargetEmail('')
    setCreateShareOrgId('')
    setCreateShareRole('read-only')
    setCreateModalError('')
    setMessage('')
    setShowCreateShareModal(true)
    await fetchOrganizations()
  }

  const closeCreateShareModal = () => {
    setShowCreateShareModal(false)
    setCreateItemType(null)
    setCreateModalError('')
  }

  const addPopoverCloseHandler = () => {
    if (!openMoreActionsDocId && !openTagPopoverDocId) {
      return
    }

    const handleDocumentClick = (event) => {
      if (
        event.target.closest('.document-action-popover') ||
        event.target.closest('.document-action-trigger') ||
        event.target.closest('.document-tag-popover') ||
        event.target.closest('.document-tag-trigger')
      ) {
        return
      }
      setOpenMoreActionsDocId(null)
      setOpenTagPopoverDocId(null)
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  }

  useEffect(addPopoverCloseHandler, [openMoreActionsDocId, openTagPopoverDocId])

  const handleCreateShareSubmit = async () => {
    setCreateModalError('')
    setMessage('')

    if (!authToken) {
      setCreateModalError('You must be logged in to create items.')
      return
    }
    if (!createItemTitle.trim()) {
      setCreateModalError('Name is required.')
      return
    }
    if (createItemType === 'folder' && (!currentLocationInfo || !currentLocationInfo.setId)) {
      setCreateModalError('Select a set or folder before creating a new folder.')
      return
    }

    let endpoint = ''
    const body = { title: createItemTitle.trim() }
    if (createItemType === 'set') {
      endpoint = '/api/user/sets'
    } else if (createItemType === 'folder') {
      endpoint = '/api/user/folders'
      body.setId = currentLocationInfo?.setId
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
        setCreateModalError(result.message || `Unable to create ${createItemType}.`)
        return
      }

      const createdItem = result.data
      let shareMessage = ''

      if (createShareTargetEmail.trim()) {
        await shareItemByEmail(
          createdItem._id,
          createItemType,
          createShareTargetEmail,
          createShareRole,
        )
        shareMessage = ` Shared with ${createShareTargetEmail.trim()}.`
      }

      if (createShareOrgId) {
        const endpoint = getShareEndpoint(createItemType, createdItem._id)
        const resp = await fetch(`${apiBase}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ targetOrgId: createShareOrgId, role: createShareRole }),
        })
        const r = await resp.json()
        if (!resp.ok) throw new Error(r.message || 'Unable to share organization')
        shareMessage += ` Shared with organization ${createShareOrgId}.`
      }

      fetchData()
      setMessage(
        `${createItemType.charAt(0).toUpperCase() + createItemType.slice(1)} created successfully.${shareMessage}`,
      )
      closeCreateShareModal()
    } catch (error) {
      setCreateModalError(error.message || `Unable to create ${createItemType}. Please try again.`)
    }
  }

  const moreActions = () => {}

  const getDeleteEndpoint = (type, itemId) => {
    if (type === 'document') return `/api/user/documents/${itemId}`
    if (type === 'folder') return `/api/user/folders/${itemId}`
    if (type === 'set') return `/api/user/sets/${itemId}`
    return null
  }

  const handleDeleteItem = async (type, item) => {
    if (!authToken) {
      setMessage(`You must be logged in to delete ${type}s.`)
      return
    }

    const endpoint = getDeleteEndpoint(type, item?._id)
    if (!endpoint) {
      setMessage(`Unable to delete ${type}.`)
      return
    }

    if (!window.confirm(t('home_deleteConfirm') || 'Are you sure? This is irreversible.')) {
      return
    }

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || `Unable to delete ${type}.`)
      }

      if (type === 'document' && String(selected.id) === String(item._id)) {
        setSelected({ type: null, id: null })
      }
      if (type === 'folder' && currentLocation.type === 'folder' && String(currentLocation.id) === String(item._id)) {
        setCurrentLocation(item.setId ? { type: 'set', id: item.setId } : { type: 'root', id: null })
        setSelected({ type: null, id: null })
      }
      if (type === 'set' && currentLocation.type === 'set' && String(currentLocation.id) === String(item._id)) {
        setCurrentLocation({ type: 'root', id: null })
        setSelected({ type: null, id: null })
      }

      setOpenMoreActionsDocId(null)
      setOpenTagPopoverDocId(null)
      await fetchData()
      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`)
    } catch (error) {
      setMessage(error.message || `Unable to delete ${type}.`)
    }
  }

  const handleOpenDocumentUpdateModal = (doc) => {
    setMessage('')
    setDocumentToUpdate(doc)
    setSelectedUpdateFile(null)
    setUpdateDragActive(false)
    setOpenMoreActionsDocId(null)
    setOpenTagPopoverDocId(null)
    setShowDocumentUpdateModal(true)
  }

  const handleDeleteDocument = (doc) => handleDeleteItem('document', doc)

  const handleCloseDocumentUpdateModal = () => {
    setShowDocumentUpdateModal(false)
    setDocumentToUpdate(null)
    setSelectedUpdateFile(null)
    setUpdateDragActive(false)
  }

  const handleUpdateFileInputChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedUpdateFile(file)
      setMessage('')
    }
  }

  const handleDocumentUpdateDrop = (event) => {
    event.preventDefault()
    setUpdateDragActive(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) {
      setSelectedUpdateFile(file)
      setMessage('')
    }
  }

  const handleDocumentUpdateDragOver = (event) => {
    event.preventDefault()
    setUpdateDragActive(true)
  }

  const handleDocumentUpdateDragLeave = () => {
    setUpdateDragActive(false)
  }

  const handleUpdateDocument = async () => {
    if (!selectedUpdateFile || !documentToUpdate) {
      setMessage('Please select a file before updating.')
      return
    }
    if (!authToken) {
      setMessage('You must be logged in to update documents.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedUpdateFile)
    formData.append('title', selectedUpdateFile.name)

    try {
      const response = await fetch(
        `${apiBase}/api/user/documents/${documentToUpdate._id}/versions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        },
      )
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.message || 'Unable to update document.')
        return
      }
      await fetchData()
      setMessage(`Document '${selectedUpdateFile.name}' updated successfully.`)
      handleCloseDocumentUpdateModal()
    } catch (error) {
      setMessage('Unable to update document. Please try again.')
    }
  }

  const handleOpenRevisionHistoryModal = async (doc) => {
    setRevisionHistoryError('')
    setRevisionHistoryLoading(true)
    setOpenMoreActionsDocId(null)
    setOpenTagPopoverDocId(null)
    setDocumentToUpdate(doc)
    setShowRevisionHistoryModal(true)

    try {
      const response = await fetch(`${apiBase}/api/user/documents/${doc._id}/revisions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Unable to load revision history.')
      }
      setRevisionHistoryData({
        versions: Array.isArray(result.data?.versions) ? result.data.versions : [],
        revisionHistory: Array.isArray(result.data?.revisionHistory)
          ? result.data.revisionHistory
          : [],
      })
    } catch (error) {
      setRevisionHistoryError(error.message || 'Unable to load revision history.')
    } finally {
      setRevisionHistoryLoading(false)
    }
  }

  const handleCloseRevisionHistoryModal = () => {
    setShowRevisionHistoryModal(false)
    setDocumentToUpdate(null)
    setRevisionHistoryData({ versions: [], revisionHistory: [] })
    setRevisionHistoryError('')
    setRevisionHistoryLoading(false)
  }

  const handleDownloadRevisionVersion = async (versionId) => {
    if (!authToken || !documentToUpdate) return
    try {
      const response = await fetch(
        `${apiBase}/api/user/documents/${documentToUpdate._id}/revisions/${versionId}/download`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      )
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Unable to download version.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = documentToUpdate.title || 'document'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage(error.message || 'Unable to download document version.')
    }
  }

  const handleRevertRevisionVersion = async (versionId) => {
    if (!authToken || !documentToUpdate) return
    try {
      const response = await fetch(
        `${apiBase}/api/user/documents/${documentToUpdate._id}/revisions/${versionId}/revert`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      )
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Unable to revert version.')
      }
      await fetchData()
      setMessage('Document reverted to selected version successfully.')
      handleCloseRevisionHistoryModal()
    } catch (error) {
      setMessage(error.message || 'Unable to revert document version.')
    }
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
    if (uploadInProgress) {
      return
    }
    setMessage('')
    setSelectedUploadFiles([])
    setDragActive(false)
    setShowDocumentUploadModal(true)
  }

  const handleCloseDocumentUploadModal = () => {
    if (uploadInProgress) {
      return
    }
    setShowDocumentUploadModal(false)
    setDragActive(false)
    setSelectedUploadFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
  }

  const handleFileInputChange = (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean)
    if (files.length) {
      setSelectedUploadFiles(files)
      setMessage('')
    }
    event.target.value = ''
  }

  const handleDocumentDrop = async (event) => {
    event.preventDefault()
    setDragActive(false)
    const files = await collectDroppedFiles(event.dataTransfer)
    if (files.length) {
      setSelectedUploadFiles(files)
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

  const findFolderInCurrentSet = (folderTitle) => {
    if (!currentLocationInfo?.setId || !folderTitle) return null
    const normalizedTitle = String(folderTitle).trim().toLowerCase()
    return folders.find(
      (folder) =>
        String(folder.setId) === String(currentLocationInfo.setId) &&
        String(folder.title || '').trim().toLowerCase() === normalizedTitle,
    )
  }

  const ensureUploadFolder = async (folderTitle, createdFolderCache) => {
    if (!currentLocationInfo?.setId || !folderTitle) return null

    const cacheKey = String(folderTitle).trim().toLowerCase()
    if (createdFolderCache.has(cacheKey)) {
      return createdFolderCache.get(cacheKey)
    }

    const existingFolder = findFolderInCurrentSet(folderTitle)
    if (existingFolder) {
      createdFolderCache.set(cacheKey, existingFolder)
      return existingFolder
    }

    const response = await fetch(`${apiBase}/api/user/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: String(folderTitle).trim(),
        setId: currentLocationInfo.setId,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.message || 'Unable to create folder for uploaded files.')
    }

    createdFolderCache.set(cacheKey, result.data)
    return result.data
  }

  const handleUploadDocument = async () => {
    if (uploadInProgress) {
      return
    }
    if (!selectedUploadFiles.length) {
      setMessage('Please select one or more files before uploading.')
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

    const uploadedFiles = []
    const failedFiles = []
    setUploadInProgress(true)

    try {
      const createdFolderCache = new Map()

      for (const file of selectedUploadFiles) {
        const relativePath = String(file.webkitRelativePath || file.name || '')
        const relativeParts = relativePath.split('/').filter(Boolean)
        const fileName = relativeParts.length > 0 ? relativeParts[relativeParts.length - 1] : file.name
        let targetFolderId = currentLocationInfo.folderId || null

        if (currentLocation.type === 'set' && relativeParts.length > 1) {
          const topFolderName = relativeParts[0]
          const uploadFolder = await ensureUploadFolder(topFolderName, createdFolderCache)
          targetFolderId = uploadFolder?._id || null
        }

        if (currentLocation.type === 'folder' && currentFolder && relativeParts.length > 1) {
          const currentFolderName = String(currentFolder.title || '').trim().toLowerCase()
          if (relativeParts[0].trim().toLowerCase() === currentFolderName) {
            targetFolderId = currentFolder._id
          }
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', fileName)
        if (targetFolderId) {
          formData.append('folderId', targetFolderId)
        }
        if (currentLocationInfo.setId) {
          formData.append('setId', currentLocationInfo.setId)
        }

        const response = await fetch(`${apiBase}/api/user/documents`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        })
        const result = await response.json()
        if (!response.ok) {
          failedFiles.push({ file, message: result.message || 'Unable to upload document.' })
          continue
        }
        uploadedFiles.push(file)
      }
    } catch (error) {
      failedFiles.push({ file: null, message: 'Unable to upload document. Please try again.' })
    }

    if (uploadedFiles.length) {
      fetchData()
    }

    if (failedFiles.length === 0) {
      const uploadedCount = uploadedFiles.length
      setUploadInProgress(false)
      setMessage(
        uploadedCount === 1
          ? `Document '${uploadedFiles[0].name}' uploaded successfully.`
          : `${uploadedCount} documents uploaded successfully.`,
      )
      handleCloseDocumentUploadModal()
      return
    }

    setUploadInProgress(false)
    setSelectedUploadFiles(failedFiles.map(({ file }) => file).filter(Boolean))
    setMessage(
      uploadedFiles.length
        ? `${uploadedFiles.length} documents uploaded. ${failedFiles.length} failed.`
        : failedFiles[0].message,
    )
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
          <mark key={i} className="bg-warning text-dark px-0">
            {part}
          </mark>
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
            <div className="text-body-secondary">{t('home_topDesc')}</div>
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
                    : openCreateShareModal(action.type)
                }
              >
                <CIcon icon={cilPlus} className="me-2" />
                {action.label}
              </CButton>
            ))}
          </div>
        </div>

        {(currentLocation.type !== 'root' || selectedTagId) && (
          <div className="mb-4 d-flex flex-wrap gap-2">
            {currentLocation.type !== 'root' && (
              <CButton
                color="secondary"
                size="sm"
                className="rounded-pill px-3"
                onClick={handleGoBack}
              >
                <CIcon icon={cilArrowLeft} className="me-2" />
                {t('home_backButton')}
              </CButton>
            )}
            {selectedTagId && (
              <CButton
                color="secondary"
                size="sm"
                className="rounded-pill px-3"
                onClick={clearTagFilter}
              >
                <CIcon icon={cilTag} className="me-2" />
                Clear tag filter
              </CButton>
            )}
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
            <div
              className="position-absolute w-100 bg-body rounded-3 border border-body-secondary mt-1"
              style={{ zIndex: 2000 }}
            >
              {searchResults.map((res, idx) => (
                <div
                  key={`${res.type}-${String(res.item._id)}-${idx}`}
                  className="d-flex justify-content-between align-items-center px-3 py-2 search-result-item"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSearchSelect(res)
                  }}
                >
                  <div className="fw-semibold">{getHighlightedText(res.item.title || '')}</div>
                  <div className="text-body-secondary small">{res.path}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <UploadDocumentModal
          visible={showDocumentUploadModal}
          onClose={handleCloseDocumentUploadModal}
          onUpload={handleUploadDocument}
          dragActive={dragActive}
          onDragOver={handleDocumentDragOver}
          onDragLeave={handleDocumentDragLeave}
          onDrop={handleDocumentDrop}
          onFileChange={handleFileInputChange}
          fileInputRef={fileInputRef}
          folderInputRef={folderInputRef}
          selectedUploadFile={selectedUploadFiles}
          allowMultiple
          folderButtonLabel={t('home_uploadChooseFolder')}
          uploadInProgress={uploadInProgress}
          t={t}
        />

        <UploadDocumentModal
          visible={showDocumentUpdateModal}
          onClose={handleCloseDocumentUpdateModal}
          onUpload={handleUpdateDocument}
          dragActive={updateDragActive}
          onDragOver={handleDocumentUpdateDragOver}
          onDragLeave={handleDocumentUpdateDragLeave}
          onDrop={handleDocumentUpdateDrop}
          onFileChange={handleUpdateFileInputChange}
          fileInputRef={updateFileInputRef}
          selectedUploadFile={selectedUpdateFile}
          header={t('home_updateHeader') || 'Update Document Version'}
          description={
            t('home_updateDesc') ||
            'Upload a new version to replace the current document contents while keeping the old version safe in revision history.'
          }
          uploadButtonLabel={t('home_updateButton') || 'Update document'}
          selectedFileLabel={t('home_selectedUpdateFile') || 'Selected update file:'}
          t={t}
        />

        <RevisionHistoryModal
          visible={showRevisionHistoryModal}
          onClose={handleCloseRevisionHistoryModal}
          item={documentToUpdate}
          loading={revisionHistoryLoading}
          error={revisionHistoryError}
          versions={revisionHistoryData.versions}
          revisionHistory={revisionHistoryData.revisionHistory}
          onDownloadVersion={handleDownloadRevisionVersion}
          onRevertVersion={handleRevertRevisionVersion}
          t={t}
        />

        <CModal
          visible={showCreateShareModal}
          size="lg"
          onClose={closeCreateShareModal}
          backdrop="static"
        >
          <CModalHeader>
            <CModalTitle>
              {createItemType === 'folder' ? t('home_create') + t('home_folder') : t('home_create') + t('home_set')}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="mb-3 text-body-secondary">
              {createItemType === 'folder'
                ? t('home_createDesc') + t('home_folder') + t('home_createDescEnd')
                : t('home_createDesc') + t('home_set') + t('home_createDescEnd')}
            </div>
            {createModalError && <div className="mb-3 text-danger">{createModalError}</div>}
            <CFormInput
              className="mb-3"
              placeholder={createItemType === 'folder' ? t('home_createName') + t('home_folder') : t('home_createName') + t('home_set')}
              value={createItemTitle}
              onChange={(e) => setCreateItemTitle(e.target.value)}
            />
            <CFormInput
              className="mb-3"
              placeholder={t('home_createSharewith')}
              value={createShareTargetEmail}
              onChange={(e) => setCreateShareTargetEmail(e.target.value)}
            />
            <div className="mb-3">
              <CFormSelect
                value={createShareRole}
                onChange={(e) => setCreateShareRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="write">{t('home_write')}</option>
                <option value="read-only">{t('home_readonly')}</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormSelect
                value={createShareOrgId}
                onChange={(e) => setCreateShareOrgId(e.target.value)}
              >
                <option value="">{t('home_createSharewithOrg')}</option>
                {organizations.map((org) => (
                  <option key={String(org._id)} value={String(org._id)}>
                    {org.name || org.title || `Organization ${org._id}`}
                  </option>
                ))}
              </CFormSelect>
              {loadingOrgs && (
                <div className="text-body-secondary small mt-2">{t('shome_loading')}</div>
              )}
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={closeCreateShareModal}>
              {t('home_cancel')}
            </CButton>
            <CButton color="primary" onClick={handleCreateShareSubmit}>
              {createItemType === 'folder' ? t('home_createButton') + t('home_folder') : t('home_createButton') + t('home_set')}
            </CButton>
          </CModalFooter>
        </CModal>

        <ShareModal
          visible={showShareModal}
          onClose={closeShareModal}
          type={shareModalType}
          item={shareModalItem}
          ownerLabel={shareModalItem ? getOwnerLabel(shareModalItem) : 'Unknown owner'}
          sharedWithEntries={shareModalItem ? getShareEntries(shareModalItem) : []}
          organizations={organizations}
          loadingOrgs={loadingOrgs}
          error={shareModalError}
          email={shareModalEmail}
          onEmailChange={setShareModalEmail}
          orgId={shareModalOrgId}
          onOrgChange={setShareModalOrgId}
          role={shareModalRole}
          onRoleChange={setShareModalRole}
          onSubmit={handleShareSubmit}
          onRemoveShare={handleRemoveShare}
          canManageShare={canManageShareEntries(shareModalItem)}
          t={t}
        />

        <CCard className="bg-body-secondary rounded-4 p-4 mb-4">
          <CCardBody>
            {loading ? (
              <div className="text-center text-body-secondary">{t('home_loading')}</div>
            ) : sets.length === 0 ? (
              <div className="text-center text-body-secondary">{t('home_emptySet')}</div>
            ) : (
              <>
                {currentLocation.type === 'root' && !selectedTagId && (
                  <CRow className="g-3">
                    {sets.map((setItem) => {
                      const isSelected =
                        selected.type === 'set' && String(selected.id) === String(setItem._id)
                      return (
                        <CCol xs={12} sm={6} lg={4} key={setItem._id}>
                          <div
                            className={`h-100 d-flex flex-column p-3 rounded-4 ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-primary text-white border border-body-secondary'
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
                            <div className="mt-auto">
                              <ItemActions
                                type="set"
                                item={setItem}
                                onShare={openShareModal}
                                onMoreActions={moreActions}
                                shareLabel={t('home_shareButton')}
                                moreActionsPopover={
                                  <DeleteItemPopover
                                    item={setItem}
                                    openItemId={openMoreActionsDocId}
                                    setOpenItemId={setOpenMoreActionsDocId}
                                    onDeleteItem={(item) => handleDeleteItem('set', item)}
                                    t={t}
                                  />
                                }
                              />
                            </div>
                          </div>
                        </CCol>
                      )
                    })}
                  </CRow>
                )}
                {currentLocation.type === 'root' && selectedTagId && (
                  <>
                    {getTaggedDocumentsForCurrentScope().length > 0 ? (
                      <CRow className="g-3">
                        {sortByPinned(getTaggedDocumentsForCurrentScope()).map((doc) => {
                          const isSelected =
                            selected.type === 'document' &&
                            String(selected.id) === String(doc._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={doc._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-body border border-body-secondary'
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
                                <div className="mt-auto">
                                  <ItemActions
                                    type="document"
                                    item={doc}
                                    onShare={openShareModal}
                                    onMoreActions={moreActions}
                                    shareLabel={t('home_shareButton')}
                                    moreActionsPopover={
                                      <DocumentActionPopover
                                        doc={doc}
                                        openMoreActionsDocId={openMoreActionsDocId}
                                        setOpenMoreActionsDocId={setOpenMoreActionsDocId}
                                        onOpenUpdateDocument={handleOpenDocumentUpdateModal}
                                        onOpenRevisionHistory={handleOpenRevisionHistoryModal}
                                        onDeleteDocument={handleDeleteDocument}
                                        t={t}
                                      />
                                    }
                                    tagPopover={
                                      <DocumentTagPopover
                                        item={doc}
                                        itemType="document"
                                        openTagPopoverDocId={openTagPopoverDocId}
                                        setOpenTagPopoverDocId={setOpenTagPopoverDocId}
                                        tags={tags}
                                        loadingTags={loadingTags}
                                        onToggleTag={handleToggleDocumentTag}
                                        onTogglePin={handleTogglePin}
                                        activeTagIds={documentUserTags[doc._id]}
                                        pinned={Boolean(doc.pinnedAt)}
                                        t={t}
                                      />
                                    }
                                  />
                                </div>
                              </div>
                            </CCol>
                          )
                        })}
                      </CRow>
                    ) : (
                      <div className="text-body-secondary">No documents match this tag.</div>
                    )}
                  </>
                )}

                {currentLocation.type === 'set' && currentSet && selectedTagId && (
                  <>
                    {getTaggedDocumentsForCurrentScope().length > 0 ? (
                      <CRow className="g-3">
                        {sortByPinned(getTaggedDocumentsForCurrentScope()).map((doc) => {
                          const isSelected =
                            selected.type === 'document' &&
                            String(selected.id) === String(doc._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={doc._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-body border border-body-secondary'
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
                                <div className="mt-auto">
                                  <ItemActions
                                    type="document"
                                    item={doc}
                                    onShare={openShareModal}
                                    onMoreActions={moreActions}
                                    shareLabel={t('home_shareButton')}
                                    moreActionsPopover={
                                      <DocumentActionPopover
                                        doc={doc}
                                        openMoreActionsDocId={openMoreActionsDocId}
                                        setOpenMoreActionsDocId={setOpenMoreActionsDocId}
                                        onOpenUpdateDocument={handleOpenDocumentUpdateModal}
                                        onOpenRevisionHistory={handleOpenRevisionHistoryModal}
                                        t={t}
                                      />
                                    }
                                    tagPopover={
                                      <DocumentTagPopover
                                        item={doc}
                                        itemType="document"
                                        openTagPopoverDocId={openTagPopoverDocId}
                                        setOpenTagPopoverDocId={setOpenTagPopoverDocId}
                                        tags={tags}
                                        loadingTags={loadingTags}
                                        onToggleTag={handleToggleDocumentTag}
                                        onTogglePin={handleTogglePin}
                                        activeTagIds={documentUserTags[doc._id]}
                                        pinned={Boolean(doc.pinnedAt)}
                                        t={t}
                                      />
                                    }
                                  />
                                </div>
                              </div>
                            </CCol>
                          )
                        })}
                      </CRow>
                    ) : (
                      <div className="text-body-secondary">No documents match this tag.</div>
                    )}
                  </>
                )}

                {currentLocation.type === 'set' && currentSet && !selectedTagId && (
                  <>
                    {(foldersBySet[String(currentSet._id)] || []).length > 0 ||
                    (docsBySet[String(currentSet._id)] || []).filter((doc) => !doc.folderId)
                      .length > 0 ? (
                      <CRow className="g-3">
                        {sortByPinned(foldersBySet[String(currentSet._id)] || []).map((folder) => {
                          const isSelected =
                            selected.type === 'folder' && String(selected.id) === String(folder._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={folder._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-body border border-body-secondary'
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
                                <div className="mt-auto">
                                  <ItemActions
                                    type="folder"
                                    item={folder}
                                    onShare={openShareModal}
                                    onMoreActions={moreActions}
                                    shareLabel={t('home_shareButton')}
                                    moreActionsPopover={
                                      <DeleteItemPopover
                                        item={folder}
                                        openItemId={openMoreActionsDocId}
                                        setOpenItemId={setOpenMoreActionsDocId}
                                        onDeleteItem={(item) => handleDeleteItem('folder', item)}
                                        t={t}
                                      />
                                    }
                                    tagPopover={
                                      <DocumentTagPopover
                                        item={folder}
                                        itemType="folder"
                                        openTagPopoverDocId={openTagPopoverDocId}
                                        setOpenTagPopoverDocId={setOpenTagPopoverDocId}
                                        tags={[]}
                                        loadingTags={false}
                                        onTogglePin={handleTogglePin}
                                        pinned={Boolean(folder.pinnedAt)}
                                        t={t}
                                      />
                                    }
                                  />
                                </div>
                              </div>
                            </CCol>
                          )
                        })}
                        {sortByPinned((docsBySet[String(currentSet._id)] || []).filter((doc) => !doc.folderId)).map((doc) => {
                          const isSelected =
                            selected.type === 'document' &&
                            String(selected.id) === String(doc._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={doc._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-body border border-body-secondary'
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
                                  <div className="mt-auto">
                                    <ItemActions
                                      type="document"
                                      item={doc}
                                      onShare={openShareModal}
                                      onMoreActions={moreActions}
                                      shareLabel={t('home_shareButton')}
                                      moreActionsPopover={
                                        <DocumentActionPopover
                                          doc={doc}
                                          openMoreActionsDocId={openMoreActionsDocId}
                                          setOpenMoreActionsDocId={setOpenMoreActionsDocId}
                                          onOpenUpdateDocument={handleOpenDocumentUpdateModal}
                                          onOpenRevisionHistory={handleOpenRevisionHistoryModal}
                                          onDeleteDocument={handleDeleteDocument}
                                          t={t}
                                        />
                                      }
                                      tagPopover={
                                        <DocumentTagPopover
                                          item={doc}
                                          itemType="document"
                                          openTagPopoverDocId={openTagPopoverDocId}
                                          setOpenTagPopoverDocId={setOpenTagPopoverDocId}
                                          tags={tags}
                                          loadingTags={loadingTags}
                                          onToggleTag={handleToggleDocumentTag}
                                          onTogglePin={handleTogglePin}
                                          activeTagIds={documentUserTags[doc._id]}
                                          pinned={Boolean(doc.pinnedAt)}
                                          t={t}
                                        />
                                      }
                                    />
                                  </div>
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
                    {(docsByFolder[String(currentFolder._id)] || []).filter(documentMatchesSelectedTag).length > 0 ? (
                      <CRow className="g-3">
                        {sortByPinned((docsByFolder[String(currentFolder._id)] || []).filter(documentMatchesSelectedTag)).map((doc) => {
                          const isSelected =
                            selected.type === 'document' && String(selected.id) === String(doc._id)
                          return (
                            <CCol xs={12} sm={6} lg={4} key={doc._id}>
                              <div
                                className={`h-100 d-flex flex-column p-3 rounded-4 ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-body border border-body-secondary'
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
                                <div className="mt-auto">
                                  <ItemActions
                                    type="document"
                                    item={doc}
                                    onShare={openShareModal}
                                    onMoreActions={moreActions}
                                    shareLabel={t('home_shareButton')}
                                    moreActionsPopover={
                                      <DocumentActionPopover
                                        doc={doc}
                                        openMoreActionsDocId={openMoreActionsDocId}
                                        setOpenMoreActionsDocId={setOpenMoreActionsDocId}
                                        onOpenUpdateDocument={handleOpenDocumentUpdateModal}
                                        onOpenRevisionHistory={handleOpenRevisionHistoryModal}
                                        onDeleteDocument={handleDeleteDocument}
                                        t={t}
                                      />
                                    }
                                    tagPopover={
                                      <DocumentTagPopover
                                        item={doc}
                                        itemType="document"
                                        openTagPopoverDocId={openTagPopoverDocId}
                                        setOpenTagPopoverDocId={setOpenTagPopoverDocId}
                                        tags={tags}
                                        loadingTags={loadingTags}
                                        onToggleTag={handleToggleDocumentTag}
                                        onTogglePin={handleTogglePin}
                                        activeTagIds={documentUserTags[doc._id]}
                                        pinned={Boolean(doc.pinnedAt)}
                                        t={t}
                                      />
                                    }
                                  />
                                </div>
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

        {message && <div className="alert alert-info rounded-4 px-4 py-3">{message}</div>}
      </CCol>
    </CRow>
  )
}

Home.propTypes = {}

export default Home
