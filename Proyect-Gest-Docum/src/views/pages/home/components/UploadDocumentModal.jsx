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
  t,
}) => {
  const selectedFiles = Array.isArray(selectedUploadFile)
    ? selectedUploadFile.filter(Boolean)
    : selectedUploadFile
      ? [selectedUploadFile]
      : []
  const resolvedUploadButtonLabel = uploadButtonLabel
    || (selectedFiles.length > 1
      ? t('home_uploadButtonMany') || 'Upload Documents'
      : t('home_uploadButton'))

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
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="h-100 d-flex flex-column align-items-center justify-content-center gap-3">
            <div className="fw-semibold">{t('home_uploadDropfiles')}</div>
            <div className="text-body-secondary">{t('home_uploadOr')}</div>
            <CButton
              color="secondary"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              {t('home_uploadChooses')}
            </CButton>
            <input
              type="file"
              ref={fileInputRef}
              hidden
              multiple={allowMultiple}
              onChange={onFileChange}
            />
            {folderInputRef && (
              <>
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation()
                    folderInputRef.current?.click()
                  }}
                >
                  {folderButtonLabel || t('home_uploadChooseFolder')}
                </CButton>
                <input
                  type="file"
                  ref={folderInputRef}
                  hidden
                  webkitdirectory=""
                  onChange={onFileChange}
                />
              </>
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
        <CButton color="secondary" onClick={onClose}>
          {t('home_cancel')}
        </CButton>
        <CButton color="primary" onClick={onUpload}>
          {resolvedUploadButtonLabel}
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
}

export default UploadDocumentModal
