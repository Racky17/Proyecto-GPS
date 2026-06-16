import React, { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  CCloseButton,
  CNavItem,
  CNavTitle,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLibrary, cilTag } from '@coreui/icons'

import { AppSidebarNav } from './AppSidebarNav'
import { useLanguage } from '../i18n'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// sidebar nav config
import { getNavigation } from '../_nav'

/**
 * AppSidebar functional component
 *
 * Manages sidebar state with Redux:
 * - sidebarShow: Controls sidebar visibility
 * - sidebarUnfoldable: Controls narrow/wide mode
 *
 * Renders navigation from _nav.js configuration file.
 * Memoized to prevent unnecessary re-renders.
 *
 * @returns {React.ReactElement} Sidebar with navigation
 */
const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const [sets, setSets] = useState([])
  const [tags, setTags] = useState([])
  const { t } = useLanguage()
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null')
    } catch (error) {
      return null
    }
  }, [])

  const location = useLocation()
  const translatedNavigation = useMemo(() => getNavigation(t), [t])

  useEffect(() => {
    const authToken = localStorage.getItem('authToken')
    if (!authToken) return

    const loadSidebarData = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || ''
        const [setsRes, tagsRes] = await Promise.all([
          fetch(`${apiBase}/api/user/sets`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
          fetch(`${apiBase}/api/user/tags`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
        ])

        const [setsData, tagsData] = await Promise.all([setsRes.json(), tagsRes.json()])
        setSets(Array.isArray(setsData.data) ? setsData.data : [])
        setTags(Array.isArray(tagsData.data) ? tagsData.data : [])
      } catch (error) {
        setSets([])
        setTags([])
      }
    }

    loadSidebarData()
  }, [location.pathname, location.search])

  const currentHomeQuery = useMemo(() => {
    const search = location.search || window.location.href.split('?')[1] || ''
    const params = new URLSearchParams(search)
    return {
      setId: params.get('setId'),
    }
  }, [location.search, location.hash])

  const buildTagLink = (tagId) => {
    const params = new URLSearchParams()
    if (location.pathname === '/' && currentHomeQuery.setId) {
      params.set('setId', currentHomeQuery.setId)
    }
    params.set('tagId', tagId)
    return `/?${params.toString()}`
  }

  const sidebarItems = useMemo(() => {
    const items = [...translatedNavigation]

    if (sets.length > 0) {
      items.push({ component: CNavTitle, name: t('sbar_sets') })
      sets.forEach((setItem) => {
        items.push({
          component: CNavItem,
          name: setItem.title,
          to: `/?setId=${setItem._id}`,
          icon: (
            <CIcon
              icon={cilLibrary}
              customClassName="nav-icon"
              style={setItem.color ? { color: setItem.color } : undefined}
            />
          ),
        })
      })
    }

    if (tags.length > 0) {
      items.push({ component: CNavTitle, name: t('sbar_tags') })
      tags.forEach((tag) => {
        items.push({
          component: CNavItem,
          name: tag.name,
          to: buildTagLink(tag._id),
          icon: (
            <CIcon
              icon={cilTag}
              customClassName="nav-icon"
              style={tag.color ? { color: tag.color } : undefined}
            />
          ),
        })
      })
    }

    return items
  }, [translatedNavigation, sets, tags, currentHomeQuery, location.pathname])

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          <CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>

      <div className="sidebar-user px-3 py-3 border-bottom text-white">
        <div className="text-uppercase small text-secondary text-truncate">{t('sbar_user')}</div>
        <div className="fw-semibold text-truncate" title={currentUser?.email || t('sbar_userNotSigned')}>
          {currentUser?.email || t('sbar_userNotSigned')}
        </div>
      </div>

      <AppSidebarNav items={sidebarItems} />

      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
