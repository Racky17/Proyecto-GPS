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
  selectedUploadFile,
  header,
  description,
  uploadButtonLabel,
  selectedFileLabel,
  t,
}) => (
  <CModal visible={visible} size="lg" onClose={onClose} backdrop="static">
    <CModalHeader>
      <CModalTitle>{header || t('home_uploadHeader')}</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <div className="mb-4 text-body-secondary">{description || t('home_uploadDesc')}</div>
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
          <div className="fw-semibold">{t('home_uploadDropfile')}</div>
          <div className="text-body-secondary">{t('home_uploadOr')}</div>
          <CButton
            color="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            {t('home_uploadChoose')}
          </CButton>
          <input type="file" ref={fileInputRef} hidden onChange={onFileChange} />
          {selectedUploadFile ? (
            <div className="text-body-secondary small">
              {`${selectedFileLabel || t('home_uploadChosen') || 'Selected file:'} ${selectedUploadFile.name}`}
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
        {uploadButtonLabel || t('home_uploadButton')}
      </CButton>
    </CModalFooter>
  </CModal>
)

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
  selectedUploadFile: PropTypes.object,
  header: PropTypes.string,
  description: PropTypes.string,
  uploadButtonLabel: PropTypes.string,
  selectedFileLabel: PropTypes.string,
  t: PropTypes.func.isRequired,
}

UploadDocumentModal.defaultProps = {
  selectedUploadFile: null,
  header: null,
  description: null,
  uploadButtonLabel: null,
  selectedFileLabel: null,
}

export default UploadDocumentModal
