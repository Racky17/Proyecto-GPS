import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormInput,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFile } from '@coreui/icons'
import { useLanguage } from '../../../i18n'

import ItemActions from '../home/components/ItemActions'
import DocumentTagPopover from '../home/components/DocumentTagPopover'
import DocumentActionPopover from '../home/components/DocumentActionPopover'
import ShareModal from '../home/components/ShareModal'

const apiBase = import.meta.env.VITE_API_BASE_URL || ''

const Shared = () => {
  const { t } = useLanguage()
  const [documents, setDocuments] = useState([])
  const [tags, setTags] = useState([])
  const [documentUserTags, setDocumentUserTags] = useState({})
  const [ownerMap, setOwnerMap] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [openTagPopoverDocId, setOpenTagPopoverDocId] = useState(null)
  const [openMoreActionsDocId, setOpenMoreActionsDocId] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareModalItem, setShareModalItem] = useState(null)
  const [shareModalEmail, setShareModalEmail] = useState('')
  const [shareModalOrgId, setShareModalOrgId] = useState('')
  const [shareModalRole, setShareModalRole] = useState('read-only')
  const [shareModalError, setShareModalError] = useState('')
  const [organizations, setOrganizations] = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState(null)

  const authToken = localStorage.getItem('authToken')
  const DOCUMENT_TAG_BATCH_SIZE = 50
  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null')
    } catch (err) {
      return null
    }
  }, [])
  const currentUserId = authUser
    ? String(authUser.id ?? authUser._id ?? authUser.userId ?? authUser.uid ?? '')
    : ''

  const fetchOwners = async (docs) => {
    const ownerIds = docs
      .map((doc) => String(doc.ownerId || doc.userId || ''))
      .filter((id) => id && id !== currentUserId)
    const uniqueOwnerIds = [...new Set(ownerIds)]
    if (uniqueOwnerIds.length === 0) {
      setOwnerMap({})
      return
    }

    const ownerMapData = {}
    await Promise.all(
      uniqueOwnerIds.map(async (ownerId) => {
        try {
          const response = await fetch(`${apiBase}/api/user/account/${ownerId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
          const result = await response.json()
          if (response.ok && result.username) {
            ownerMapData[ownerId] = result.email || result.username || ownerId
          } else {
            ownerMapData[ownerId] = result.email || result.username || t('shar_unknown')
          }
        } catch (err) {
          ownerMapData[ownerId] = t('shar_unknown')
        }
      }),
    )
    setOwnerMap(ownerMapData)
  }

  const fetchUserDocumentTags = async (docs) => {
    if (!authToken || !Array.isArray(docs) || docs.length === 0) return
    try {
      setLoadingTags(true)
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

        Object.entries(result.data || {}).forEach(([docId, docTags]) => {
          tagsMap[String(docId)] = Array.isArray(docTags) ? docTags.map(String) : []
        })
      }

      setDocumentUserTags(tagsMap)
    } catch (err) {
      // ignore
    } finally {
      setLoadingTags(false)
    }
  }

  const fetchData = async () => {
    if (!authToken) return
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const [docsRes, tagsRes] = await Promise.all([
        fetch(`${apiBase}/api/user/documents`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${apiBase}/api/user/tags`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ])
      const [docsJson, tagsJson] = await Promise.all([docsRes.json(), tagsRes.json()])

      const loadedDocs = Array.isArray(docsJson.data) ? docsJson.data : []
      setDocuments(loadedDocs)
      setTags(Array.isArray(tagsJson.data) ? tagsJson.data : [])
      await fetchUserDocumentTags(loadedDocs)
      await fetchOwners(loadedDocs)
    } catch (err) {
      setError(t('shar_loading') || 'Unable to load shared documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  const isCurrentUserOwner = (doc) => {
    const ownerId = String(doc.ownerId || doc.userId || '')
    return ownerId && ownerId === currentUserId
  }

  const sharedDocuments = useMemo(
    () => documents.filter((doc) => !isCurrentUserOwner(doc)),
    [documents, currentUserId],
  )

  const matchesSearch = (doc) => {
    if (!searchQuery.trim()) return true
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const title = String(doc.title || '').toLowerCase()
    const ownerName = String(ownerMap[String(doc.ownerId || doc.userId || '')] || '').toLowerCase()
    return title.includes(normalizedQuery) || ownerName.includes(normalizedQuery)
  }

  const visibleDocuments = useMemo(
    () => sharedDocuments.filter((doc) => matchesSearch(doc)),
    [sharedDocuments, searchQuery, ownerMap],
  )

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

  const handleTogglePin = async (item) => {
    if (!authToken || !item || !item._id) return
    try {
      const response = await fetch(`${apiBase}/api/user/documents/${item._id}/pin`, {
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
      setDocuments((prev) => prev.map((doc) => (String(doc._id) === String(item._id) ? result.data : doc)))
      setMessage('Document pin state updated.')
    } catch (error) {
      setMessage('Unable to update pin state. Please try again.')
    }
  }

  const handleSelectDocument = (doc) => {
    setSelectedDocId(String(doc._id))
    setMessage('')
  }

  const downloadDocument = async (doc) => {
    if (!authToken || !doc || !doc._id) return
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

  const getOwnerLabel = (item) => {
    const ownerId = item?.ownerId || item?.userId || item?.createdBy || null
    if (!ownerId) return t('shar_unknown')
    if (String(ownerId) === currentUserId) return t('shar_you') || 'You'
    return ownerMap[String(ownerId)] || String(ownerId)
  }

  const openShareModal = (type, item) => {
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
    setShareModalItem(null)
    setShareModalError('')
  }

  const getShareEndpoint = (type, itemId) => {
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
    const currentUserIdLocal = currentUserId
    return normalizeSharedWithEntries(item.sharedWith).map((entry) => {
      if (entry.type === 'user') {
        const userId = String(entry.userId || '')
        const ownerLabel = userId === currentUserIdLocal ? t('shar_you') || 'You' : entry.name || entry.email || userId
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
        label: String(entry?.name || entry?.email || entry?.id || t('shar_unknown')),
      }
    })
  }

  const canManageShareEntries = (item) => {
    if (!item || !currentUserId) return false
    const ownerId = String(item.ownerId || item.userId || '')
    return ownerId === currentUserId
  }

  const handleRemoveShare = async (entry) => {
    if (!authToken || !shareModalItem || !entry) {
      setShareModalError(t('shar_removefail') || 'Unable to remove share entry.')
      return
    }

    const endpoint = getShareEndpoint('document', shareModalItem._id)
    if (!endpoint) {
      setShareModalError(t('shar_removefail') || 'Unable to remove share entry.')
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
        throw new Error(result.message || t('shar_removefail') || 'Unable to remove share entry.')
      }

      setShareModalItem((prevItem) => {
        if (!prevItem) return prevItem
        const updatedSharedWith = normalizeSharedWithEntries(prevItem.sharedWith).filter((existing) => {
          if (entry.type === 'user') {
            return String(existing.userId) !== String(entry.userId)
          }
          if (entry.type === 'org') {
            return String(existing.orgId) !== String(entry.orgId)
          }
          return true
        })
        return {
          ...prevItem,
          sharedWith: updatedSharedWith,
        }
      })
      await fetchData()
      setMessage(t('shar_removed') || 'Share access removed successfully.')
    } catch (error) {
      setShareModalError(error.message || t('shar_removefail') || 'Unable to remove share entry.')
    }
  }

  const shareItemByEmail = async (itemId, email, roleParam) => {
    const endpoint = getShareEndpoint('document', itemId)
    if (!endpoint) {
      throw new Error(t('shar_sharefail') || 'Unable to share document.')
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
      throw new Error(result.message || t('shar_sharefail') || `Unable to share document with ${email}.`)
    }
    return email.trim()
  }

  const handleShareSubmit = async () => {
    setShareModalError('')
    setMessage('')
    if (!authToken) {
      setShareModalError(t('shar_login') || 'You must be logged in to share items.')
      return
    }
    if (!shareModalItem) {
      setShareModalError(t('shar_noselect') || 'No item selected.')
      return
    }
    if (!shareModalEmail.trim() && !shareModalOrgId) {
      setShareModalError(t('shar_sharewithrequired') || 'Enter an email or choose an organization to share with.')
      return
    }

    try {
      const sharedParts = []
      if (shareModalEmail.trim()) {
        await shareItemByEmail(shareModalItem._id, shareModalEmail.trim(), shareModalRole)
        sharedParts.push(`user ${shareModalEmail.trim()}`)
      }
      if (shareModalOrgId) {
        const response = await fetch(`${apiBase}${getShareEndpoint('document', shareModalItem._id)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ targetOrgId: shareModalOrgId, role: shareModalRole }),
        })
        const r = await response.json()
        if (!response.ok) throw new Error(r.message || t('shar_sharefail') || 'Unable to share organization')
        sharedParts.push(`organization ${shareModalOrgId}`)
      }
      await fetchData()
      setMessage(
        `Document shared successfully.${sharedParts.length > 0 ? ` Shared with ${sharedParts.join(' and ')}.` : ''}`,
      )
      closeShareModal()
    } catch (error) {
      setShareModalError(error.message || t('shar_sharefail') || 'Unable to share item.')
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

  const handleOpenDocumentUpdateModal = () => {
    setMessage(t('shar_updateUnsupported') || 'Update document is not available on shared items.')
    setOpenMoreActionsDocId(null)
  }

  const handleOpenRevisionHistoryModal = () => {
    setMessage(t('shar_revisionUnsupported') || 'Revision history is not available on shared items.')
    setOpenMoreActionsDocId(null)
  }

  useEffect(() => {
    if (!openMoreActionsDocId && !openTagPopoverDocId) {
      return undefined
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
  }, [openMoreActionsDocId, openTagPopoverDocId])

  return (
    <CContainer>
      <CRow className="justify-content-center">
        <CCol xl={10} lg={12}>
          <CCard>
            <CCardHeader>{t('shar_title')}</CCardHeader>
            <CCardBody>
              <p className="text-muted mb-4">{t('shar_desc')}</p>
              {error && <div className="mb-3 text-danger">{error}</div>}
              {message && <div className="mb-3 text-success">{message}</div>}

              <div className="d-flex flex-column flex-sm-row gap-3 mb-4">
                <CFormInput
                  placeholder={t('shome_sharedwithemail') || 'Search by owner email or title'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <CButton
                  color="secondary"
                  onClick={() => {
                    setSearchQuery('')
                  }}
                >
                  {t('shome_clearFilter') || 'Clear'}
                </CButton>
              </div>

              {loading ? (
                <p className="text-body-secondary">{t('shar_loading')}</p>
              ) : visibleDocuments.length === 0 ? (
                <p className="text-muted">{t('shar_noDocs')}</p>
              ) : (
                <CRow className="g-3">
                  {sortByPinned(visibleDocuments).map((doc) => {
                    const isSelected = selectedDocId === String(doc._id)
                    const ownerName = getOwnerLabel(doc)
                    return (
                      <CCol xs={12} sm={6} lg={4} key={String(doc._id)}>
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
                              <div className="fw-semibold">{doc.title || t('shar_unknown')}</div>
                              <div className="text-body-secondary small mt-1">
                                {t('shar_from')} {ownerName}
                              </div>
                            </div>
                          </div>
                          {renderTagMarkers(doc)}
                          <div className="mt-auto">
                            <ItemActions
                              type="document"
                              item={doc}
                              onShare={openShareModal}
                              onMoreActions={() => {}}
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
              )}

              <ShareModal
                visible={showShareModal}
                onClose={closeShareModal}
                type="document"
                item={shareModalItem}
                ownerLabel={shareModalItem ? getOwnerLabel(shareModalItem) : t('shar_unknown')}
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
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

Shared.propTypes = {}

export default Shared
