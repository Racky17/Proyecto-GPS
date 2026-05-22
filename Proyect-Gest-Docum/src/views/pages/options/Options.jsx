import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CRow,
} from '@coreui/react'
import { useLanguage } from '../../../i18n'

const Options = () => {
  const navigate = useNavigate()
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#0d6efd')
  const [editingTagId, setEditingTagId] = useState(null)
  const [editingTagName, setEditingTagName] = useState('')
  const [editingTagColor, setEditingTagColor] = useState('#0d6efd')
  const [loadingTags, setLoadingTags] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { language, setLanguage, t } = useLanguage()
  const [languageMessage, setLanguageMessage] = useState('')

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null')
    } catch (error) {
      return null
    }
  }, [])

  const authToken = localStorage.getItem('authToken')
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  const handleLanguageChange = (event) => {
    const selectedLanguage = event.target.value
    setLanguage(selectedLanguage)
    setLanguageMessage(t('opt_languageSaved'))
  }

  useEffect(() => {
    const loadTags = async () => {
      if (!authToken) {
        return
      }
      setLoadingTags(true)
      setError('')
      try {
        const response = await fetch(`${apiBase}/api/user/tags`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
        const result = await response.json()
        if (!response.ok) {
          setError(result.message || 'Unable to load tags.')
          return
        }
        setTags(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        setError('Unable to load tags.')
      } finally {
        setLoadingTags(false)
      }
    }
    loadTags()
  }, [authToken, apiBase])

  const handleLogout = async () => {
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })
    } catch (error) {
      // ignore failing backend logout; proceed with local cleanup
    }
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    localStorage.removeItem('userId')
    navigate('/login')
  }

  const refreshTags = async () => {
    setError('')
    setMessage('')
    if (!authToken) {
      setError('Not authenticated.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/user/tags`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to load tags.')
        return
      }
      setTags(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      setError('Unable to load tags.')
    }
  }

  const handleAddTag = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!newTagName.trim()) {
      setError('Tag name is required.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/user/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to create tag.')
        return
      }
      setNewTagName('')
      setNewTagColor('#0d6efd')
      setMessage('Tag created successfully.')
      refreshTags()
    } catch (err) {
      setError('Unable to create tag.')
    }
  }

  const handleEditTag = (tag) => {
    setError('')
    setMessage('')
    setEditingTagId(tag._id)
    setEditingTagName(tag.name)
    setEditingTagColor(tag.color || '#0d6efd')
  }

  const handleCancelEdit = () => {
    setError('')
    setMessage('')
    setEditingTagId(null)
    setEditingTagName('')
    setEditingTagColor('#0d6efd')
  }

  const handleUpdateTag = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!editingTagName.trim()) {
      setError('Tag name is required.')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/user/tags/${editingTagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: editingTagName.trim(), color: editingTagColor }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to update tag.')
        return
      }
      setMessage('Tag updated successfully.')
      handleCancelEdit()
      refreshTags()
    } catch (err) {
      setError('Unable to update tag.')
    }
  }

  const handleDeleteTag = async (tagId) => {
    setError('')
    setMessage('')
    if (!window.confirm('Delete this tag?')) {
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/user/tags/${tagId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to delete tag.')
        return
      }
      setMessage('Tag deleted successfully.')
      refreshTags()
    } catch (err) {
      setError('Unable to delete tag.')
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-column align-items-center py-4">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={6}>
            <CCard className="mb-4">
              <CCardHeader>{t('opt_title')}</CCardHeader>
              <CCardBody>
                <div className="mb-4">
                  <p className="mb-1">{t('opt_signeduser')}</p>
                  <strong>{currentUser?.email || t('opt_unknownuser')}</strong>
                </div>
                <p className="text-muted mb-4">
                  {t('opt_optionsdesc')}
                </p>
                <div className="d-flex gap-2">
                  <CButton color="danger" onClick={handleLogout}>
                    {t('opt_logout')}
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
            <CCard className="mb-4">
              <CCardHeader>{t('opt_language')}</CCardHeader>
              <CCardBody>
                <p className="text-muted mb-3">{t('opt_selectLanguage')}</p>
                <div className="mb-3">
                  <label className="form-label">{t('opt_currentLanguage')}</label>
                  <select
                    className="form-select"
                    value={language}
                    onChange={handleLanguageChange}
                  >
                    <option value="en">{t('opt_english')}</option>
                    <option value="es">{t('opt_spanish')}</option>
                  </select>
                </div>
                {languageMessage && (
                  <div className="small text-success">{languageMessage}</div>
                )}
              </CCardBody>
            </CCard>
            <CCard>
              <CCardHeader>{t('opt_manageTags')}</CCardHeader>
              <CCardBody>
                <p className="text-muted mb-4">
                  {t('opt_tagsDesc')}
                </p>
                {error && <div className="mb-3 text-danger">{error}</div>}
                {message && <div className="mb-3 text-success">{message}</div>}
                <CForm onSubmit={editingTagId ? handleUpdateTag : handleAddTag}>
                  <div className="d-flex flex-column gap-3 mb-4">
                    <div className="d-flex gap-2 align-items-center">
                      <CFormInput
                        placeholder={t('opt_tagsPlaceholder')}
                        value={editingTagId ? editingTagName : newTagName}
                        onChange={(e) =>
                          editingTagId ? setEditingTagName(e.target.value) : setNewTagName(e.target.value)
                        }
                      />
                      <input
                        type="color"
                        value={editingTagId ? editingTagColor : newTagColor}
                        onChange={(e) =>
                          editingTagId ? setEditingTagColor(e.target.value) : setNewTagColor(e.target.value)
                        }
                        style={{ width: '3rem', height: '2.5rem', border: 'none', padding: 0 }}
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <CButton color="primary" type="submit">
                        {editingTagId ? t('opt_tagsSave') : t('opt_tagsCreate')}
                      </CButton>
                      {editingTagId && (
                        <CButton color="secondary" type="button" onClick={handleCancelEdit}>
                          {t('opt_tagsCancel')}
                        </CButton>
                      )}
                    </div>
                  </div>
                </CForm>
                <div>
                  <h5 className="mb-3">{t('opt_tagsYour')}</h5>
                  {loadingTags ? (
                    <p className="text-body-secondary">{t('opt_tagsLoading')}</p>
                  ) : tags.length === 0 ? (
                    <p className="text-muted">{t('opt_tagsEmpty')}</p>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {tags.map((tag) => (
                        <li
                          key={String(tag._id)}
                          className="d-flex align-items-center justify-content-between rounded-3 bg-body border border-body-secondary p-3 mb-2"
                        >
                          <div className="d-flex align-items-center gap-3">
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: tag.color || '#0d6efd',
                                display: 'inline-block',
                              }}
                            />
                            <div>
                              <strong>{tag.name}</strong>
                              <div className="text-body-secondary small">{tag.color}</div>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <CButton size="sm" color="secondary" onClick={() => handleEditTag(tag)}>
                              {t('opt_tagsEdit')}
                            </CButton>
                            <CButton
                              size="sm"
                              color="danger"
                              onClick={() => handleDeleteTag(tag._id)}
                            >
                              {t('opt_tagsDelete')}
                            </CButton>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Options
