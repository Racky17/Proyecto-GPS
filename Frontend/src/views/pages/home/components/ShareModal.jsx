import React from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

const ShareModal = ({
  visible,
  onClose,
  type,
  item,
  ownerLabel,
  sharedWithEntries,
  organizations,
  loadingOrgs,
  error,
  email,
  onEmailChange,
  orgId,
  onOrgChange,
  role,
  onRoleChange,
  onSubmit,
  onRemoveShare,
  canManageShare,
  t,
}) => (
  <CModal visible={visible} size="lg" onClose={onClose} backdrop="static">
    <CModalHeader>
      <CModalTitle>{t('shome_share')} {t('shome_'+type)}</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <div className="mb-3 text-body-secondary">
        {t('shome_desc')}
      </div>
      {error && <div className="mb-3 text-danger">{error}</div>}
      <div className="mb-3">
        <div className="small text-body-secondary mb-1">{t('shome_owner')}</div>
        <div className="rounded-3 border border-body-secondary p-3 bg-body">
          {ownerLabel}
        </div>
      </div>
      <div className="mb-3">
        <div className="small text-body-secondary mb-1">{t('shome_sharedwith')}</div>
        <div className="rounded-3 border border-body-secondary p-3 bg-body">
          {sharedWithEntries.length > 0 ? (
            <ul className="mb-0 ps-3">
              {sharedWithEntries.map((shared, index) => (
                <li
                  key={`${String(item?._id)}-${shared.id || index}`}
                  className="d-flex justify-content-between align-items-start gap-3"
                >
                  <span>{shared.label}</span>
                  {canManageShare && (
                    <CButton size="sm" color="danger" onClick={() => onRemoveShare(shared)}>
                      Remove
                    </CButton>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-body-secondary">{t('shome_notsharedyet')}</div>
          )}
        </div>
      </div>
      <CFormInput
        className="mb-3"
        placeholder={t('shome_sharedwithemail')}
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />
      <div className="mb-3">
        <CFormSelect value={role} onChange={(e) => onRoleChange(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="write">Write</option>
          <option value="read-only">Read-only</option>
        </CFormSelect>
      </div>
      <div className="mb-3">
        <CFormSelect value={orgId} onChange={(e) => onOrgChange(e.target.value)}>
          <option value="">{t('shome_sharewithorg')}</option>
          {organizations.map((org) => (
            <option key={String(org._id)} value={String(org._id)}>
              {org.name || org.title || `Organization ${org._id}`}
            </option>
          ))}
        </CFormSelect>
        {loadingOrgs && <div className="text-body-secondary small mt-2">{t('shome_loading')}</div>}
      </div>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" onClick={onClose}>
        {t('home_cancel')}
      </CButton>
      <CButton color="primary" onClick={onSubmit}>
        {t('home_shareButton')}
      </CButton>
    </CModalFooter>
  </CModal>
)

ShareModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.string,
  item: PropTypes.object,
  ownerLabel: PropTypes.string.isRequired,
  sharedWithEntries: PropTypes.array.isRequired,
  organizations: PropTypes.array.isRequired,
  loadingOrgs: PropTypes.bool.isRequired,
  error: PropTypes.string,
  email: PropTypes.string.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  orgId: PropTypes.string.isRequired,
  onOrgChange: PropTypes.func.isRequired,
  role: PropTypes.string.isRequired,
  onRoleChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onRemoveShare: PropTypes.func.isRequired,
  canManageShare: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
}

ShareModal.defaultProps = {
  type: null,
  item: null,
  error: '',
}

export default ShareModal
