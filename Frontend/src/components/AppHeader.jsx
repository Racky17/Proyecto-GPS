import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CButton, useColorModes } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilMoon, cilSun } from '@coreui/icons'
import { useLanguage } from '../i18n'

const AppHeader = () => {
  const dispatch = useDispatch()
  const currentTheme = useSelector((state) => state.theme)
  const { setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const { t } = useLanguage()

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
    dispatch({ type: 'set', theme: nextTheme })
    setColorMode(nextTheme)
  }

  const isDarkMode = currentTheme === 'dark'

  return (
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3 bg-body border-bottom border-body-secondary py-2 px-3">
      <CButton
        color="secondary"
        size="sm"
        className="rounded-pill d-lg-none"
        onClick={() => dispatch({ type: 'set', sidebarShow: true })}
      >
        <CIcon icon={cilMenu} />
      </CButton>
      <CButton color="secondary" size="sm" className="rounded-pill" onClick={handleToggleTheme}>
        <CIcon icon={isDarkMode ? cilSun : cilMoon} className="me-2" />
        {isDarkMode ? t('hder_light') : t('hder_dark')}
      </CButton>
    </div>
  )
}

export default AppHeader
