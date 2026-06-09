import React from 'react'
import { Navigate } from 'react-router-dom'

const getAuthToken = () => localStorage.getItem('authToken')

const PublicRoute = ({ children }) => {
  const token = getAuthToken()
  return token ? <Navigate to="/" replace /> : children
}

export default PublicRoute
