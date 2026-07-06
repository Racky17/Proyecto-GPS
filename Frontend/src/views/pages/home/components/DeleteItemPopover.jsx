import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CPopover } from '@coreui/react'

const DeleteItemPopover = ({
  item,
  openItemId,
  setOpenItemId,
  onDeleteItem,
  deleteLabel,
  t,
}) => {
  const isVisible = openItemId === String(item._id)

  const handleDelete = async (event) => {
    event.stopPropagation()
    setOpenItemId(null)
    await onDeleteItem(item)
  }

  return (
    <CPopover
      trigger="focus"
      placement="bottom"
      visible={isVisible}
      onHide={() => setOpenItemId(null)}
      content={(
        <div
          className="bg-body rounded-3 border-body-secondary"
          style={{ minWidth: '180px' }}
        >
          <div className="d-flex flex-column gap-2 p-3">
            <CButton
              color="danger"
              size="sm"
              className="rounded-pill"
              onClick={handleDelete}
            >
              {deleteLabel || t('home_delete') || 'Delete'}
            </CButton>
          </div>
        </div>
      )}
    >
      <CButton
        size="sm"
        color="secondary"
        className="rounded-pill px-3 document-action-trigger"
        onClick={(event) => {
          event.stopPropagation()
          setOpenItemId((current) => (current === String(item._id) ? null : String(item._id)))
        }}
      >
        ⋯
      </CButton>
    </CPopover>
  )
}

DeleteItemPopover.propTypes = {
  item: PropTypes.object.isRequired,
  openItemId: PropTypes.string,
  setOpenItemId: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  deleteLabel: PropTypes.string,
  t: PropTypes.func.isRequired,
}

DeleteItemPopover.defaultProps = {
  openItemId: null,
  deleteLabel: null,
}

export default DeleteItemPopover