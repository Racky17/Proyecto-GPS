import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CPopover,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilFile, cilSearch } from '@coreui/icons'
import { useLanguage } from '../../../i18n'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const Shared = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [tags, setTags] = useState([])
  const [documentUserTags, setDocumentUserTags] = useState({})
  const [loadingTags, setLoadingTags] = useState(false)
  const [openTagPopoverDocId, setOpenTagPopoverDocId] = useState(null)
  const [selected, setSelected] = useState({ type: null, id: null })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const authToken = localStorage.getItem('authToken')
  const authUser = JSON.parse(localStorage.getItem('authUser') || 'null')
  const userIdFromStorage = authUser
    ? String(authUser.id ?? authUser._id ?? authUser.userId ?? authUser.uid ?? '')
    : null

  const sharedDocuments = useMemo(() => {
    if (!userIdFromStorage) return []
    return documents.filter((doc) => {
      const docSharedWith = Array.isArray(doc.sharedWith) ? doc.sharedWith.map(String) : []
      const isSharedWithMe = docSharedWith.includes(userIdFromStorage)
      const isNotMine = String(doc.ownerId) !== userIdFromStorage
      return isSharedWithMe && isNotMine
    })
  }, [documents, userIdFromStorage])

  const fetchData = async () => {
    if (!authToken) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${apiBase}/api/user/documents`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const result = await response.json()
      setDocuments(Array.isArray(result.data) ? result.data : [])
      fetchUserDocumentTags(Array.isArray(result.data) ? result.data : [])
    } catch (error) {
      setMessage('Unable to load shared files. Please refresh.')
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

  const renderTagPopover = (doc) => {
    const activeTagIds = Array.isArray(documentUserTags[doc._id])
      ? documentUserTags[doc._id].map(String)
      : []
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
              <a href="/#/options" className="text-decoration-none">
                + Manage tags
              </a>
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

  const renderTagMarkers = (item) => {
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
        Share
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

  return (
    <CRow className="mb-4">
      <CCol>
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
          <div>
            <h1 className="display-6 mb-0">{t('shar_title')}</h1>
            <div className="text-body-secondary">{t('shar_desc')}</div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton
              color="secondary"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => navigate('/')}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              {t('shar_goBack')}
            </CButton>
          </div>
        </div>

        <CInputGroup className="mb-4 rounded-pill overflow-hidden border border-1 border-body-secondary">
          <CInputGroupText className="bg-body-secondary border-0 text-body-secondary">
            <CIcon icon={cilSearch} />
          </CInputGroupText>
          <CFormInput placeholder="Search Document" className="border-0" disabled />
        </CInputGroup>

        <CCard className="bg-body-secondary rounded-4 p-4 mb-4">
          <CCardBody>
            {loading ? (
              <div className="text-center text-body-secondary">{t('shar_loading')}</div>
            ) : sharedDocuments.length === 0 ? (
              <div className="text-center text-body-secondary">{t('shar_noDocs')}</div>
            ) : (
              <CRow className="g-3">
                {sharedDocuments.map((doc) => {
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
                            <div className="text-body-secondary small">
                              {t('shar_from')} <strong>{doc.ownerName || t('shar_unknown')}</strong>
                            </div>
                            {renderTagMarkers(doc)}
                          </div>
                        </div>
                        <div className="mt-auto">{renderItemActions('document', doc)}</div>
                      </div>
                    </CCol>
                  )
                })}
              </CRow>
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

Shared.propTypes = {}

export default Shared
