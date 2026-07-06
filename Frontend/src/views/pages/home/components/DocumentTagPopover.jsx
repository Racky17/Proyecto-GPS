import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CLink, CPopover } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTag } from '@coreui/icons'

const DocumentTagPopover = ({
  item,
  itemType = 'document',
  openTagPopoverDocId,
  setOpenTagPopoverDocId,
  tags,
  loadingTags,
  onToggleTag,
  onTogglePin,
  activeTagIds,
  pinned,
  t,
}) => {
  const normalizedActiveTagIds = Array.isArray(activeTagIds) ? activeTagIds.map(String) : []
  const isVisible = openTagPopoverDocId === String(item._id)
  const isDocument = itemType === 'document'

  const handlePinChange = (event) => {
    event.stopPropagation()
    if (typeof onTogglePin === 'function') {
      onTogglePin(item, itemType)
    }
  }

  return (
    <CPopover
      trigger="focus"
      placement="bottom"
      visible={isVisible}
      onHide={() => setOpenTagPopoverDocId(null)}
      content={
        <div
          className="document-tag-popover bg-body rounded-3 border-body-secondary"
          style={{ minWidth: '240px' }}
        >
          <div className="mb-3">
            <CLink href="/#/options" className="text-decoration-none">
              {t('tag_manage')}
            </CLink>
          </div>
          <div className="d-flex flex-column gap-2">
            <label
              htmlFor={`pin-toggle-${item._id}`}
              className="d-flex align-items-center justify-content-between rounded-3 p-2 bg-body border border-body-secondary"
              style={{ cursor: typeof onTogglePin === 'function' ? 'pointer' : 'default' }}
            >
              <span className="d-flex align-items-center gap-2">
                <span
                  className="rounded-circle border border-body-secondary d-inline-flex align-items-center justify-content-center"
                  style={{ width: '16px', height: '16px' }}
                >
                  📌
                </span>
                <span>{pinned ? `${t('tag_unpin')}` : `${t('tag_pin')}`}</span>
              </span>
              <input
                id={`pin-toggle-${item._id}`}
                type="checkbox"
                checked={Boolean(pinned)}
                onChange={handlePinChange}
                disabled={typeof onTogglePin !== 'function'}
              />
            </label>
            {isDocument ? (
              loadingTags ? (
                <div className="text-body-secondary">{t('tag_loading')}</div>
              ) : tags.length === 0 ? (
                <div className="text-muted">{t('tag_notags')}</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {tags.map((tag) => {
                    const checked = normalizedActiveTagIds.includes(String(tag._id))
                    return (
                      <label
                        htmlFor={`tag-toggle-${item._id}-${tag._id}`}
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
                          id={`tag-toggle-${item._id}-${tag._id}`}
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            event.stopPropagation()
                            onToggleTag(item, tag._id)
                          }}
                        />
                      </label>
                    )
                  })}
                </div>
              )
            ) : (
              <div className="text-body-secondary small">{t('tag_pinhelp')}</div>
            )}
          </div>
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
            current === String(item._id) ? null : String(item._id),
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
  item: PropTypes.object.isRequired,
  itemType: PropTypes.string,
  openTagPopoverDocId: PropTypes.string,
  setOpenTagPopoverDocId: PropTypes.func.isRequired,
  tags: PropTypes.array.isRequired,
  loadingTags: PropTypes.bool.isRequired,
  onToggleTag: PropTypes.func,
  onTogglePin: PropTypes.func,
  activeTagIds: PropTypes.array,
  pinned: PropTypes.bool,
  t: PropTypes.func.isRequired,
}

DocumentTagPopover.defaultProps = {
  itemType: 'document',
  openTagPopoverDocId: null,
  onToggleTag: null,
  onTogglePin: null,
  activeTagIds: [],
  pinned: false,
}

export default DocumentTagPopover
