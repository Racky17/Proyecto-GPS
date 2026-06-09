import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const getAuthToken = () => localStorage.getItem('authToken')

const RequireAuth = ({ children }) => {
  const location = useLocation()
  const token = getAuthToken()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default RequireAuth
