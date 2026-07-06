import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

const TEXT_TYPES = /^(text\/|application\/(json|xml|javascript|x-yaml))/
const PREVIEW_MAX_TEXT = 200000

/**
 * Modal de previsualización de documentos.
 * Descarga el archivo desde /preview (con token) y lo renderiza según su
 * tipo MIME: imagen, PDF, texto, audio o vídeo. Para tipos no soportados
 * ofrece la descarga directa.
 */
const DocumentPreviewModal = ({ doc, apiBase, authToken, onClose, onDownload, t }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [blobUrl, setBlobUrl] = useState('')
  const [contentType, setContentType] = useState('')
  const [textContent, setTextContent] = useState(null)

  useEffect(() => {
    if (!doc) return undefined

    let objectUrl = ''
    let cancelled = false

    const loadPreview = async () => {
      setLoading(true)
      setError('')
      setBlobUrl('')
      setTextContent(null)
      setContentType('')

      try {
        const response = await fetch(`${apiBase}/api/user/documents/${doc._id}/preview`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })

        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result.message || t('preview_error'))
        }

        const type = (response.headers.get('Content-Type') || doc.file?.contentType || '').split(
          ';',
        )[0]
        const blob = await response.blob()
        if (cancelled) return

        setContentType(type)
        if (TEXT_TYPES.test(type)) {
          const text = await blob.text()
          if (cancelled) return
          setTextContent(text.slice(0, PREVIEW_MAX_TEXT))
        } else {
          objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t('preview_error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPreview()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doc, apiBase, authToken, t])

  if (!doc) return null

  const renderContent = () => {
    if (loading) {
      return (
        <div className="d-flex flex-column align-items-center gap-3 py-5">
          <CSpinner color="primary" />
          <span className="text-body-secondary">{t('preview_loading')}</span>
        </div>
      )
    }

    if (error) {
      return <div className="text-danger py-4 text-center">{error}</div>
    }

    if (textContent !== null) {
      return (
        <pre
          className="bg-body-tertiary rounded-3 p-3 mb-0"
          style={{ maxHeight: '65vh', overflow: 'auto', whiteSpace: 'pre-wrap' }}
        >
          {textContent}
        </pre>
      )
    }

    if (blobUrl && contentType.startsWith('image/')) {
      return (
        <div className="text-center">
          <img
            src={blobUrl}
            alt={doc.title || 'preview'}
            style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
          />
        </div>
      )
    }

    if (blobUrl && contentType === 'application/pdf') {
      return (
        <iframe
          src={blobUrl}
          title={doc.title || 'preview'}
          style={{ width: '100%', height: '70vh', border: 'none' }}
        />
      )
    }

    if (blobUrl && contentType.startsWith('video/')) {
      return (
        <video src={blobUrl} controls style={{ width: '100%', maxHeight: '65vh' }}>
          {t('preview_unavailable')}
        </video>
      )
    }

    if (blobUrl && contentType.startsWith('audio/')) {
      return (
        <div className="py-4 text-center">
          <audio src={blobUrl} controls style={{ width: '100%' }}>
            {t('preview_unavailable')}
          </audio>
        </div>
      )
    }

    return <div className="text-body-secondary py-4 text-center">{t('preview_unavailable')}</div>
  }

  return (
    <CModal size="xl" visible onClose={onClose} scrollable>
      <CModalHeader>
        <CModalTitle className="text-truncate">
          {doc.file?.originalName || doc.title || t('preview_title')}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>{renderContent()}</CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          {t('preview_close')}
        </CButton>
        <CButton
          color="primary"
          onClick={() => {
            onDownload(doc)
          }}
        >
          {t('home_download')}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

DocumentPreviewModal.propTypes = {
  doc: PropTypes.object,
  apiBase: PropTypes.string.isRequired,
  authToken: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

DocumentPreviewModal.defaultProps = {
  doc: null,
  authToken: '',
}

export default DocumentPreviewModal
