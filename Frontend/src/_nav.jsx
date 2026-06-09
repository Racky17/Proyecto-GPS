/**
 * Sidebar Navigation Configuration
 *
 * Defines the structure and content of the sidebar navigation menu.
 * Supports multiple navigation component types from CoreUI React:
 * - CNavItem: Single navigation link
 * - CNavGroup: Collapsible group of links
 * - CNavTitle: Section title/divider
 *
 * @module _nav
 */

import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilFolderOpen, cilHome, cilLibrary, cilSettings, cilShareAll, cilTag, cilBuilding} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'


/**
 * Navigation menu structure array
 *
 * @type {Array<Object>}
 * @property {React.ComponentType} component - CoreUI nav component (CNavItem, CNavGroup, CNavTitle)
 * @property {string} namekey - Translation key for the display text
 * @property {string} [to] - Internal route path (for CNavItem with routing)
 * @property {string} [href] - External URL (for CNavItem with external links)
 * @property {React.ReactNode} [icon] - Icon element to display
 * @property {Object} [badge] - Optional badge configuration
 * @property {string} badge.color - Badge color (info, danger, success, etc.)
 * @property {string} badge.text - Badge text content
 * @property {Array<Object>} [items] - Child items for CNavGroup
 */
const navigationConfig = [
  {
    component: CNavItem,
    namekey: 'sbar_home',
    to: '/',
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    namekey: 'sbar_options',
    to: '/options',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    namekey: 'sbar_org',
    to: '/organizations',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    namekey: 'sbar_recent',
    to: '/',
    icon: <CIcon icon={cilFolderOpen} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    namekey: 'sbar_shared',
    to: '/shared',
    icon: <CIcon icon={cilShareAll} customClassName="nav-icon" />,
  },
]

export const getNavigation = (t) =>
  navigationConfig.map((item) => ({
    ...item,
    name: item.namekey ? t(item.namekey) : item.name,
  }))

export default navigationConfig
