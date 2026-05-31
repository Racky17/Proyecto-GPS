import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'

const ItemActions = ({
  type,
  item,
  onShare,
  onMoreActions,
  tagPopover,
  moreActionsPopover,
  shareLabel,
}) => (
  <div className="d-flex flex-wrap gap-2 mt-3">
    <CButton
      size="sm"
      color="secondary"
      className="rounded-pill px-3"
      onClick={(event) => {
        event.stopPropagation()
        onShare(type, item)
      }}
    >
      {shareLabel}
    </CButton>
    {tagPopover}
    {moreActionsPopover || (
      <CButton
        size="sm"
        color="secondary"
        className="rounded-pill px-3"
        onClick={(event) => {
          event.stopPropagation()
          onMoreActions(type, item)
        }}
      >
        ⋯
      </CButton>
    )}
  </div>
)

ItemActions.propTypes = {
  type: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  onShare: PropTypes.func.isRequired,
  onMoreActions: PropTypes.func.isRequired,
  tagPopover: PropTypes.node,
  moreActionsPopover: PropTypes.node,
  shareLabel: PropTypes.string,
}

ItemActions.defaultProps = {
  tagPopover: null,
  shareLabel: 'Share',
}

export default ItemActions
