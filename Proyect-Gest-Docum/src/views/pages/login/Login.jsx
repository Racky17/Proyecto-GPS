import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { deriveKey, storeEncryptionKey } from 'src/utils/encryption'
import { useLanguage } from '../../../i18n'

const apiBase = import.meta.env.VITE_API_BASE_URL || ''

console.log('API Base URL:', apiBase)

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t, language, setLanguage, availableLanguages } = useLanguage()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'Login failed. Check your credentials.')
        setLoading(false)
        return
      }

      if (result.encryptionSalt) {
        try {
          const key = await deriveKey(password, result.encryptionSalt)
          await storeEncryptionKey(key, result.encryptionSalt)
        } catch (err) {
          console.warn('Unable to derive encryption key:', err)
        }
      }

      localStorage.setItem('authToken', result.token)
      localStorage.setItem('authUser', JSON.stringify(result.user))
      const savedUserId = result.user.id ?? result.user._id
      if (savedUserId) {
        localStorage.setItem('userId', savedUserId)
      }
      navigate('/')
    } catch (err) {
      setError('Unable to connect to backend. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex align-items-center py-5">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol xs={12} lg={10}>
            <CRow className="g-4 align-items-stretch">
              <CCol xs={12} lg={6}>
                <CCard className="p-4 h-100">
                  <CCardBody>
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                      <div>
                        <h1>{t('login_title')}</h1>
                        <p className="text-body-secondary mb-0">{t('login_desc')}</p>
                      </div>
                      <CFormSelect
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ maxWidth: '14rem' }}
                        aria-label="Language selector"
                      >
                        {availableLanguages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                    {error && <CAlert color="danger">{error}</CAlert>}
                    <CForm onSubmit={handleSubmit}>
                      <CInputGroup className="mb-3">
                        <CInputGroupText>
                          <CIcon icon={cilUser} />
                        </CInputGroupText>
                        <CFormInput
                          placeholder={t('login_username')}
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </CInputGroup>
                      <CInputGroup className="mb-4">
                        <CInputGroupText>
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          type="password"
                          placeholder={t('login_password')}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </CInputGroup>
                      <CRow className="align-items-center">
                        <CCol xs={12} sm={6} className="mb-2 mb-sm-0">
                          <CButton color="primary" className="w-100" type="submit" disabled={loading}>
                            {loading ? t('login_signingIn') : t('login_button')}
                          </CButton>
                        </CCol>
                      </CRow>
                    </CForm>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol xs={12} lg={6}>
                <CCard className="text-white bg-primary py-5 h-100">
                  <CCardBody className="d-flex flex-column justify-content-center align-items-center text-center h-100 px-4">
                    <div>
                      <h2>{t('login_newHere')}</h2>
                      <p>{t('login_newHereDesc')}</p>
                      <Link to="/register">
                        <CButton color="primary" className="mt-3" active tabIndex={-1}>
                          {t('login_registerNow')}
                        </CButton>
                      </Link>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
