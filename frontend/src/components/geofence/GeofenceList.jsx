import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Users, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Button from '../common/Button';
import GeofenceForm from './GeofenceForm';
import Modal from '../common/Modal';

export default function GeofenceList() {
  const [geofences, setGeofences] = useState([
    {
      id: 1,
      name: 'Main Office',
      address: '123 Business St, City',
      radius: 100,
      active: true,
      employeeCount: 45,
      lastUpdated: '2024-02-12T10:00:00',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    {
      id: 2,
      name: 'Branch Office',
      address: '456 Commerce Ave, City',
      radius: 75,
      active: true,
      employeeCount: 28,
      lastUpdated: '2024-02-12T09:30:00',
      coordinates: { lat: 37.7849, lng: -122.4294 }
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (id) => {
    setGeofences(geofences.filter(g => g.id !== id));
    setShowDeleteConfirm(false);
  };

  const handleEdit = (geofence) => {
    setSelectedGeofence(geofence);
    setShowForm(true);
  };

  const handleToggleActive = (id) => {
    setGeofences(geofences.map(g => 
      g.id === id ? { ...g, active: !g.active } : g
    ));
  };

  const handleFormSubmit = (formData) => {
    if (selectedGeofence) {
      // Update existing geofence
      setGeofences(geofences.map(g =>
        g.id === selectedGeofence.id ? { ...g, ...formData } : g
      ));
    } else {
      // Add new geofence
      setGeofences([...geofences, {
        ...formData,
        id: geofences.length + 1,
        employeeCount: 0,
        lastUpdated: new Date().toISOString()
      }]);
    }
    setShowForm(false);
    setSelectedGeofence(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Geofences</h1>
          <p className="text-gray-500">Manage your organization's geofences</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedGeofence(null);
            setShowForm(true);
          }}
        >
          Add New Geofence
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {geofences.map((geofence) => (
          <Card key={geofence.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{geofence.name}</h3>
                    <p className="text-gray-500">{geofence.address}</p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        {geofence.employeeCount} employees
                      </span>
                      <span className="flex items-center text-sm text-gray-500">
                        {geofence.radius}m radius
                      </span>
                      <span
                        className={`flex items-center text-sm ${
                          geofence.active ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {geofence.active ? (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {geofence.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleToggleActive(geofence.id)}
                  >
                    {geofence.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(geofence)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setSelectedGeofence(geofence);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedGeofence(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Geofence"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete this geofence? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(selectedGeofence?.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}