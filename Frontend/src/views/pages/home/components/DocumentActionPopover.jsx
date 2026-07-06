import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CPopover } from '@coreui/react'

const DocumentActionPopover = ({
  doc,
  openMoreActionsDocId,
  setOpenMoreActionsDocId,
  onOpenUpdateDocument,
  onOpenRevisionHistory,
  onDeleteDocument,
  onPreviewDocument,
  onDownloadDocument,
  t,
}) => {
  const isVisible = openMoreActionsDocId === String(doc._id)

  return (
    <CPopover
      trigger="focus"
      placement="bottom"
      visible={isVisible}
      onHide={() => setOpenMoreActionsDocId(null)}
      content={
        <div
          className="document-action-popover bg-body rounded-3 border-body-secondary"
          style={{ minWidth: '220px' }}
        >
          <div className="d-flex flex-column gap-2 p-3">
            {onPreviewDocument && (
              <CButton
                color="primary"
                size="sm"
                className="rounded-pill"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenMoreActionsDocId(null)
                  onPreviewDocument(doc)
                }}
              >
                {t('home_preview') || 'Preview'}
              </CButton>
            )}
            {onDownloadDocument && (
              <CButton
                color="secondary"
                size="sm"
                className="rounded-pill"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenMoreActionsDocId(null)
                  onDownloadDocument(doc)
                }}
              >
                {t('home_download') || 'Download'}
              </CButton>
            )}
            <CButton
              color="secondary"
              size="sm"
              className="rounded-pill"
              onClick={(event) => {
                event.stopPropagation()
                setOpenMoreActionsDocId(null)
                onOpenUpdateDocument(doc)
              }}
            >
              {t('home_updateDocument') || 'Update document'}
            </CButton>
            <CButton
              color="danger"
              size="sm"
              className="rounded-pill"
              onClick={(event) => {
                event.stopPropagation()
                setOpenMoreActionsDocId(null)
                onDeleteDocument(doc)
              }}
            >
              {t('home_delete') || 'Delete'}
            </CButton>
            <CButton
              color="secondary"
              size="sm"
              className="rounded-pill"
              onClick={(event) => {
                event.stopPropagation()
                setOpenMoreActionsDocId(null)
                onOpenRevisionHistory(doc)
              }}
            >
              {t('home_revisionHistory') || 'Revision history'}
            </CButton>
          </div>
        </div>
      }
    >
      <CButton
        size="sm"
        color="secondary"
        className="rounded-pill px-3 document-action-trigger"
        onClick={(event) => {
          event.stopPropagation()
          setOpenMoreActionsDocId((current) =>
            current === String(doc._id) ? null : String(doc._id),
          )
        }}
      >
        ⋯
      </CButton>
    </CPopover>
  )
}

DocumentActionPopover.propTypes = {
  doc: PropTypes.object.isRequired,
  openMoreActionsDocId: PropTypes.string,
  setOpenMoreActionsDocId: PropTypes.func.isRequired,
  onOpenUpdateDocument: PropTypes.func.isRequired,
  onOpenRevisionHistory: PropTypes.func.isRequired,
  onDeleteDocument: PropTypes.func.isRequired,
  onPreviewDocument: PropTypes.func,
  onDownloadDocument: PropTypes.func,
  t: PropTypes.func.isRequired,
}

DocumentActionPopover.defaultProps = {
  openMoreActionsDocId: null,
  onPreviewDocument: null,
  onDownloadDocument: null,
}

export default DocumentActionPopover
