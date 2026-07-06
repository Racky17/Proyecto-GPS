import React from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

const UploadDocumentModal = ({
  visible,
  onClose,
  onUpload,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  fileInputRef,
  folderInputRef,
  selectedUploadFile,
  header,
  description,
  uploadButtonLabel,
  selectedFileLabel,
  selectedFilesLabel,
  allowMultiple,
  folderButtonLabel,
  uploadInProgress,
  t,
}) => {
  const selectedFiles = Array.isArray(selectedUploadFile)
    ? selectedUploadFile.filter(Boolean)
    : selectedUploadFile
      ? [selectedUploadFile]
      : []
  const resolvedUploadButtonLabel =
    uploadButtonLabel ||
    (selectedFiles.length > 1
      ? t('home_uploadButtonMany') || 'Upload Documents'
      : t('home_uploadButton'))
  const loadingLabel = t('home_uploading') || 'Uploading...'

  return (
    <CModal visible={visible} size="lg" onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{header || t('home_uploadHeader')}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-4 text-body-secondary">{description || t('home_uploadDescs')}</div>
        <div
          className={`rounded-4 border-2 p-4 text-center ${
            dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-body-secondary'
          }`}
          style={{ minHeight: '200px', cursor: 'pointer' }}
          onDragOver={(event) => {
            if (!uploadInProgress) {
              onDragOver(event)
            }
          }}
          onDragLeave={(event) => {
            if (!uploadInProgress) {
              onDragLeave(event)
            }
          }}
          onDrop={(event) => {
            if (!uploadInProgress) {
              onDrop(event)
            }
          }}
          onClick={() => {
            if (!uploadInProgress) {
              fileInputRef.current?.click()
            }
          }}
        >
          <div className="h-100 d-flex flex-column align-items-center justify-content-center gap-3">
            <div className="fw-semibold">{t('home_uploadDropfile')}</div>
            <div className="text-body-secondary">{t('home_uploadOr')}</div>
            <CButton
              color="secondary"
              size="sm"
              disabled={uploadInProgress}
              onClick={(event) => {
                event.stopPropagation()
                if (!uploadInProgress) {
                  fileInputRef.current?.click()
                }
              }}
            >
              {t('home_uploadChoose')}
            </CButton>
            <input
              type="file"
              ref={fileInputRef}
              hidden
              multiple={allowMultiple}
              disabled={uploadInProgress}
              onChange={onFileChange}
            />
            {folderInputRef && (
              <>
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  disabled={uploadInProgress}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!uploadInProgress) {
                      folderInputRef.current?.click()
                    }
                  }}
                >
                  {folderButtonLabel || t('home_uploadChooseFolder')}
                </CButton>
                <input
                  type="file"
                  ref={folderInputRef}
                  hidden
                  webkitdirectory=""
                  disabled={uploadInProgress}
                  onChange={onFileChange}
                />
              </>
            )}
            {uploadInProgress && (
              <div className="d-flex align-items-center gap-2 text-primary small">
                <CSpinner size="sm" />
                <span>{loadingLabel}</span>
              </div>
            )}
            {selectedFiles.length ? (
              <div className="text-body-secondary small text-start">
                <div className="fw-semibold">
                  {selectedFiles.length > 1
                    ? `${selectedFilesLabel || t('home_uploadChosenMany') || 'Chosen files:'} ${selectedFiles.length}`
                    : `${selectedFileLabel || t('home_uploadChosen') || 'Selected file:'} ${selectedFiles[0].name}`}
                </div>
                {selectedFiles.length > 1 && (
                  <ul className="mb-0 mt-2 ps-3">
                    {selectedFiles.slice(0, 6).map((file) => (
                      <li key={`${file.name}-${file.webkitRelativePath || ''}`}>
                        {file.webkitRelativePath || file.name}
                      </li>
                    ))}
                    {selectedFiles.length > 6 && <li>+{selectedFiles.length - 6} more</li>}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-body-secondary small">
                {t('home_uploadNoFile') || 'No file selected yet.'}
              </div>
            )}
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={uploadInProgress}>
          {t('home_cancel')}
        </CButton>
        <CButton color="primary" onClick={onUpload} disabled={uploadInProgress}>
          {uploadInProgress ? loadingLabel : resolvedUploadButtonLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

UploadDocumentModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  dragActive: PropTypes.bool.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  fileInputRef: PropTypes.object.isRequired,
  folderInputRef: PropTypes.object,
  selectedUploadFile: PropTypes.oneOfType([PropTypes.object, PropTypes.arrayOf(PropTypes.object)]),
  header: PropTypes.string,
  description: PropTypes.string,
  uploadButtonLabel: PropTypes.string,
  selectedFileLabel: PropTypes.string,
  selectedFilesLabel: PropTypes.string,
  allowMultiple: PropTypes.bool,
  folderButtonLabel: PropTypes.string,
  uploadInProgress: PropTypes.bool,
  t: PropTypes.func.isRequired,
}

UploadDocumentModal.defaultProps = {
  selectedUploadFile: null,
  header: null,
  description: null,
  uploadButtonLabel: null,
  selectedFileLabel: null,
  selectedFilesLabel: null,
  allowMultiple: false,
  folderButtonLabel: null,
  folderInputRef: null,
  uploadInProgress: false,
}

export default UploadDocumentModal
