// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { GeofenceProvider } from './contexts/GeofenceContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GeofenceProvider>
          <App />
        </GeofenceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);