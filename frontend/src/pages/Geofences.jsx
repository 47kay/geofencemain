import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Users, Plus } from 'lucide-react';
import Button from '../components/common/Button';
import GeofenceList from '../components/geofence/GeofenceList';
import GeofenceMap from '../components/geofence/GeofenceMap';
import GeofenceForm from '../components/geofence/GeofenceForm';
import Modal from '../components/common/Modal';
import useGeofence from '../hooks/useGeofence';

export default function Geofences() {
  const [view, setView] = useState('list'); // 'list' or 'map'
  const [showForm, setShowForm] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const { geofences, loading, error, fetchGeofences } = useGeofence();

  useEffect(() => {
    fetchGeofences();
  }, []);

  const handleCreateGeofence = () => {
    setSelectedGeofence(null);
    setShowForm(true);
  };

  const handleEditGeofence = (geofence) => {
    setSelectedGeofence(geofence);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Geofences</h1>
          <p className="text-gray-500">Manage your organization's geofences</p>
        </div>
        <div className="flex space-x-4">
          <div className="btn-group">
            <button
              className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('list')}
            >
              List View
            </button>
            <button
              className={`btn ${view === 'map' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('map')}
            >
              Map View
            </button>
          </div>
          <Button
            variant="primary"
            onClick={handleCreateGeofence}
            className="flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Geofence
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Geofences</p>
                <p className="text-2xl font-semibold">{geofences.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Employees</p>
                <p className="text-2xl font-semibold">
                  {geofences.reduce((sum, g) => sum + (g.activeEmployees || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Geofences</p>
                <p className="text-2xl font-semibold">
                  {geofences.filter(g => g.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading geofences...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">Error loading geofences: {error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          {view === 'list' ? (
            <GeofenceList
              geofences={geofences}
              onEdit={handleEditGeofence}
            />
          ) : (
            <GeofenceMap
              geofences={geofences}
              onGeofenceSelect={setSelectedGeofence}
            />
          )}
        </div>
      )}

      {/* Geofence Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedGeofence(null);
        }}
        title={selectedGeofence ? 'Edit Geofence' : 'Add New Geofence'}
      >
        <GeofenceForm
          initialData={selectedGeofence}
          onSubmit={() => {
            setShowForm(false);
            setSelectedGeofence(null);
            fetchGeofences();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedGeofence(null);
          }}
        />
      </Modal>
    </div>
  );
}