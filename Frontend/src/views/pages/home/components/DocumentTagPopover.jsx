import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CLink, CPopover } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTag } from '@coreui/icons'

const DocumentTagPopover = ({
  doc,
  openTagPopoverDocId,
  setOpenTagPopoverDocId,
  tags,
  loadingTags,
  onToggleTag,
  activeTagIds,
  t,
}) => {
  const normalizedActiveTagIds = Array.isArray(activeTagIds) ? activeTagIds.map(String) : []
  const isVisible = openTagPopoverDocId === String(doc._id)

  return (
    <CPopover
      trigger="focus"
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
                const checked = normalizedActiveTagIds.includes(String(tag._id))
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
                        onToggleTag(doc, tag._id)
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
        <CIcon icon={cilTag} className="me-2" />
        {t('home_tagButton')}
      </CButton>
    </CPopover>
  )
}

DocumentTagPopover.propTypes = {
  doc: PropTypes.object.isRequired,
  openTagPopoverDocId: PropTypes.string,
  setOpenTagPopoverDocId: PropTypes.func.isRequired,
  tags: PropTypes.array.isRequired,
  loadingTags: PropTypes.bool.isRequired,
  onToggleTag: PropTypes.func.isRequired,
  activeTagIds: PropTypes.array,
  t: PropTypes.func.isRequired,
}

DocumentTagPopover.defaultProps = {
  openTagPopoverDocId: null,
  activeTagIds: [],
}

export default DocumentTagPopover
