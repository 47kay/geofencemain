// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Geofences from './pages/Geofences';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import OrganizationRegistration from './pages/Registration';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import DashboardLayout from './components/layout/Layout';
import Reports from './pages/Reports';
import Organization from './pages/Organization';

function App() {
  const location = useLocation()
  const authPages = ['/', '/register', "/login", "/forgot-password"]
  console.log({ pathname: location.pathname})
  if (authPages.includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<OrganizationRegistration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />)
      </Routes>)
  } else {
    return (
      <DashboardLayout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/geofences" element={<Geofences />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/organization" element={<Organization />} />
        </Routes>
      </DashboardLayout>
    );
  }
};


export default App;