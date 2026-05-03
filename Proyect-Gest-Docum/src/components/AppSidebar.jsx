import React, { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

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

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// sidebar nav config
import navigation from '../_nav'

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

  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null')
    } catch (error) {
      return null
    }
  }, [])

  useEffect(() => {
    const authToken = localStorage.getItem('authToken')
    if (!authToken) return

    const loadSidebarData = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
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
  }, [])

  const sidebarItems = useMemo(() => {
    const items = [...navigation]

    if (sets.length > 0) {
      items.push({ component: CNavTitle, name: 'Document Sets:' })
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
      items.push({ component: CNavTitle, name: 'Document Tags:' })
      tags.forEach((tag) => {
        items.push({
          component: CNavItem,
          name: tag.name,
          to: '/', /* TODO: Implement tag filtering route via search bar in Home */
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
  }, [navigation, sets, tags])

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
        <div className="text-uppercase small text-secondary">User</div>
        <div className="fw-semibold text-truncate" title={currentUser?.email || 'Not signed in'}>
          {currentUser?.email || 'Not signed in'}
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
