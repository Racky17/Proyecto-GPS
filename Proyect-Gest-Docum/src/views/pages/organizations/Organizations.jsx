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

const Organizations = () => {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [newOrgName, setNewOrgName] = useState('')
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [expandedOrgId, setExpandedOrgId] = useState(null)
  const [orgMembers, setOrgMembers] = useState({})
  const [memberForms, setMemberForms] = useState({})
  const [addingMember, setAddingMember] = useState(false)
  const [removingMember, setRemovingMember] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { t } = useLanguage()
  const [languageMessage, setLanguageMessage] = useState('')

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null')
    } catch (error) {
      return null
    }
  }, [])

  const currentUserId = currentUser
    ? String(currentUser.id ?? currentUser._id ?? currentUser.userId ?? currentUser.uid ?? '')
    : ''

  const canManageOrg = (org) => {
    if (!org || !currentUserId) return false
    if (String(org.ownerId) === currentUserId) return true
    return Array.isArray(org.members) && org.members.some(
      (member) => member.type === 'user' && String(member.id) === currentUserId && member.role === 'administrator',
    )
  }

  const authToken = localStorage.getItem('authToken')
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  const ROLE_OPTIONS = [
    { value: 'administrator', label: 'Administrator' },
    { value: 'read-write', label: 'Read / Write' },
    { value: 'read-only', label: 'Read Only' },
  ]

  useEffect(() => {
    const loadOrgs = async () => {
      if (!authToken) return
      setLoadingOrgs(true)
      setError('')
      try {
        const response = await fetch(`${apiBase}/api/organizations`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const result = await response.json()
        if (!response.ok) {
          setError(result.message || 'Unable to load organizations.')
          return
        }
        setOrgs(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        setError('Unable to load organizations.')
      } finally {
        setLoadingOrgs(false)
      }
    }
    loadOrgs()
  }, [authToken, apiBase])

  const refreshOrgs = async () => {
    setError('')
    setMessage('')
    if (!authToken) {
      setError('Not authenticated.')
      return
    }
    try {
      const response = await fetch(`${apiBase}/api/organizations`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to load organizations.')
        return
      }
      setOrgs(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      setError('Unable to load organizations.')
    }
  }
  const handleAddOrg = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!newOrgName.trim()) {
      setError('Organization name is required.')
      return
    }
    try {
      const response = await fetch(`${apiBase}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to create organization.')
        return
      }
      setNewOrgName('')
      setMessage('Organization created successfully.')
      refreshOrgs()
    } catch (err) {
      setError('Unable to create organization.')
    }
  }

  const toggleExpand = async (orgId) => {
    if (expandedOrgId === orgId) {
      setExpandedOrgId(null)
      return
    }
    // fetch org with expanded members
    try {
      const response = await fetch(`${apiBase}/api/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to load organization.')
        return
      }
      setOrgMembers((s) => ({ ...s, [orgId]: result.data.members || [] }))
      setExpandedOrgId(orgId)
    } catch (err) {
      setError('Unable to load organization members.')
    }
  }

  const handleMemberInputChange = (orgId, field, value) => {
    setMemberForms((prev) => ({ ...prev, [orgId]: { ...(prev[orgId] || {}), [field]: value } }))
  }

  const handleAddMember = async (orgId) => {
    setError('')
    setMessage('')
    const form = memberForms[orgId] || {}
    if (!form.email || !form.role) {
      setError('Member email and role are required.')
      return
    }
    setAddingMember(true)
    try {
      const response = await fetch(`${apiBase}/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userEmail: form.email, role: form.role }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to add member.')
        return
      }
      setMessage('Member added.')
      // refresh members
      await toggleExpand(orgId)
      await toggleExpand(orgId) // re-open to refresh
      handleMemberInputChange(orgId, 'email', '')
      handleMemberInputChange(orgId, 'role', '')
    } catch (err) {
      setError('Unable to add member.')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (orgId, memberId) => {
    setError('')
    setMessage('')
    setRemovingMember((prev) => ({ ...prev, [memberId]: true }))
    try {
      const response = await fetch(`${apiBase}/api/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message || 'Unable to remove member.')
        return
      }
      setMessage('Member removed.')
      await toggleExpand(orgId)
      await toggleExpand(orgId) // re-open to refresh
    } catch (err) {
      setError('Unable to remove member.')
    } finally {
      setRemovingMember((prev) => ({ ...prev, [memberId]: false }))
    }
  }

  return (
    <CContainer>
    <CRow className="justify-content-center">
        <CCol md={16} lg={20}>
        <CCard>
            <CCardHeader>{t('org_title')}</CCardHeader>
            <CCardBody>
            <p className="text-muted mb-4">{t('org_desc')}</p>
            {error && <div className="mb-3 text-danger">{error}</div>}
            {message && <div className="mb-3 text-success">{message}</div>}

            <CForm onSubmit={handleAddOrg}>
                <div className="d-flex flex-wrap gap-2 mb-4">
                <CFormInput
                    placeholder={t('org_new')}
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                />
                <CButton color="primary" type="submit">{t('org_create')}</CButton>
                </div>
            </CForm>

            <div>
                <h5 className="mb-3">{t('org_yourOrgs')}</h5>
                {loadingOrgs ? (
                <p className="text-body-secondary">{t('org_loadingOrgs')}</p>
                ) : orgs.length === 0 ? (
                <p className="text-muted">{t('org_noOrgs')}</p>
                ) : (
                <ul className="list-unstyled mb-0">
                    {orgs.map((org) => (
                    <li
                        key={String(org._id)}
                        className="d-flex flex-column rounded-3 bg-body border border-body-secondary p-3 mb-2"
                    >
                        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between mb-2">
                        <div>
                            <strong>{org.name}</strong>
                            <div className="text-body-secondary small">{t('org_owner')} {String(org.ownerId)}</div>
                        </div>
                        <div className="d-flex gap-2 mt-2 mt-sm-0">
                            <CButton size="sm" color="secondary" onClick={() => toggleExpand(org._id)}>
                            {expandedOrgId === org._id ? t('org_hide') : t('org_manage')}
                            </CButton>
                        </div>
                        </div>

                        {expandedOrgId === org._id && (
                        <div className="mt-2">
                            <h6 className="mb-2">{t('org_members')}</h6>
                            <ul className="list-unstyled mb-3">
                            {(orgMembers[org._id] || []).map((m, idx) => (
                                <li key={idx} className="bg-body-tertiary d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-2">
                                <div>
                                    {m.type === 'user' ? (
                                    <>
                                        <strong>{m.user?.username || m.user?.email || m.user?.name || m.user?.id}</strong>
                                        <div className="text-body-secondary small">{m.user?.email || ''}</div>
                                    </>
                                    ) : (
                                    <>
                                        <strong>{m.organization?.name || m.organization?.id}</strong>
                                        <div className="text-body-secondary small">Organization</div>
                                    </>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
                                  <div className="text-muted small">{m.role}</div>
                                  {m.type === 'user' && canManageOrg(org) && String(m.user?._id || m.user?.id || '') !== String(org.ownerId) && (
                                    <CButton
                                      size="sm"
                                      color="danger"
                                      disabled={Boolean(removingMember[m.user?._id || m.user?.id])}
                                      onClick={() => handleRemoveMember(org._id, m.user?._id || m.user?.id)}
                                    >
                                      {removingMember[m.user?._id || m.user?.id] ? 'Removing...' : 'Remove'}
                                    </CButton>
                                  )}
                                </div>
                                </li>
                            ))}
                            </ul>

                            <div className="d-flex flex-wrap gap-2 align-items-center">
                            <CFormInput
                                className="flex-grow-1"
                                placeholder={t('org_membEmail')}
                                value={(memberForms[org._id] || {}).email || ''}
                                onChange={(e) => handleMemberInputChange(org._id, 'email', e.target.value)}
                            />
                            <select
                                value={(memberForms[org._id] || {}).role || ''}
                                onChange={(e) => handleMemberInputChange(org._id, 'role', e.target.value)}
                                className="form-select"
                                style={{ minWidth: '10rem' }}
                            >
                                <option value="">{t('org_selRole')}</option>
                                {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                            <CButton size="sm" color="primary" onClick={() => handleAddMember(org._id)} disabled={addingMember}>
                                {t('org_add')}
                            </CButton>
                            </div>
                        </div>
                        )}
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
  )
}

export default Organizations