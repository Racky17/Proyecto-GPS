import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const RevisionHistoryModal = ({
  visible,
  onClose,
  item,
  loading,
  error,
  versions,
  revisionHistory,
  onDownloadVersion,
  onRevertVersion,
  t,
}) => (
  <CModal visible={visible} size="lg" onClose={onClose} backdrop="static">
    <CModalHeader>
      <CModalTitle>
        {item?.title
          ? `${item.title} - ${t('home_revisionHistory') || 'Revision history'}`
          : t('home_revisionHistory') || 'Revision history'}
      </CModalTitle>
    </CModalHeader>
    <CModalBody>
      {loading ? (
        <div className="text-body-secondary">{t('home_loading') || 'Loading...'}</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <div className="d-flex flex-column gap-4">
          <div>
            <h5>{t('home_versions') || 'Versions'}</h5>
            {versions.length === 0 ? (
              <div className="text-body-secondary">
                {t('home_noVersions') || 'No archived versions yet.'}
              </div>
            ) : (
              versions.map((version) => (
                <div
                  key={String(version._id)}
                  className="rounded-3 border border-body-secondary p-3 mb-3"
                >
                  <div className="d-flex flex-column flex-sm-row justify-content-between gap-3 align-items-start">
                    <div>
                      <div className="fw-semibold">
                        {version.originalName || version.title || t('home_version')}
                      </div>
                      <div className="text-body-secondary small">
                        {version.contentType || 'Unknown type'} ·{' '}
                        {version.size
                          ? `${version.size} bytes`
                          : t('home_unknownSize') || 'Unknown size'}
                      </div>
                      <div className="text-body-secondary small">
                        {t('home_archivedAt') || 'Archived at'}{' '}
                        {new Date(version.archivedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <CButton
                        size="sm"
                        color="secondary"
                        onClick={() => onDownloadVersion(version._id)}
                      >
                        {t('home_download') || 'Download'}
                      </CButton>
                      <CButton
                        size="sm"
                        color="primary"
                        onClick={() => onRevertVersion(version._id)}
                      >
                        {t('home_revert') || 'Revert'}
                      </CButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div>
            <h5>{t('home_revisionHistory') || 'Revision history'}</h5>
            {revisionHistory.length === 0 ? (
              <div className="text-body-secondary">
                {t('home_noRevisionHistory') || 'No revision actions yet.'}
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {revisionHistory.map((entry) => (
                  <div
                    key={String(entry._id || `${entry.timestamp}-${entry.action}`)}
                    className="rounded-3 border border-body-secondary p-3"
                  >
                    <div className="d-flex justify-content-between gap-3 flex-wrap">
                      <div>
                        <div className="fw-semibold">{entry.action}</div>
                        <div className="text-body-secondary small">
                          {entry.userName || entry.userId} •{' '}
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <div className="text-body-secondary small mt-2">
                        {JSON.stringify(entry.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" onClick={onClose}>
        {t('home_cancel') || 'Close'}
      </CButton>
    </CModalFooter>
  </CModal>
)

RevisionHistoryModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  item: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  versions: PropTypes.array.isRequired,
  revisionHistory: PropTypes.array.isRequired,
  onDownloadVersion: PropTypes.func.isRequired,
  onRevertVersion: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

RevisionHistoryModal.defaultProps = {
  item: null,
  error: null,
}

export default RevisionHistoryModal
