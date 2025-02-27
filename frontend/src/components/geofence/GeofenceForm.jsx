import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import GeofenceMap from './GeofenceMap';

export default function GeofenceForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    radius: initialData?.radius || 100,
    active: initialData?.active ?? true,
    coordinates: initialData?.coordinates || { lat: 37.7749, lng: -122.4194 },
    description: initialData?.description || '',
    workingHours: initialData?.workingHours || {
      start: '09:00',
      end: '17:00'
    },
    allowedDays: initialData?.allowedDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  const [errors, setErrors] = useState({});

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter(d => d !== day)
        : [...prev.allowedDays, day]
    }));
  };

  const handleWorkingHoursChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [type]: value
      }
    }));
  };

  const handleLocationSelect = (coordinates) => {
    setFormData(prev => ({
      ...prev,
      coordinates
    }));
  };

  const handleRadiusChange = (radius) => {
    setFormData(prev => ({
      ...prev,
      radius
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.radius || formData.radius < 50) {
      newErrors.radius = 'Radius must be at least 50 meters';
    }
    if (formData.allowedDays.length === 0) {
      newErrors.allowedDays = 'At least one day must be selected';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Geofence Name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <Input
          label="Address"
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          error={errors.address}
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border rounded-md"
            placeholder="Enter geofence description..."
          />
        </div>

        <div className="h-[400px]">
          <GeofenceMap
            selectedGeofence={formData}
            onGeofenceSelect={handleLocationSelect}
            onRadiusChange={handleRadiusChange}
            editable={true}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Working Hours</label>
          <div className="flex space-x-4">
            <Input
              type="time"
              value={formData.workingHours.start}
              onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
              label="Start Time"
            />
            <Input
              type="time"
              value={formData.workingHours.end}
              onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
              label="End Time"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Allowed Days</label>
          <div className="flex flex-wrap gap-2">
            {days.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`px-3 py-1 rounded-full text-sm ${
                  formData.allowedDays.includes(day)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {errors.allowedDays && (
            <p className="text-sm text-red-600">{errors.allowedDays}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="active"
            name="active"
            checked={formData.active}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label htmlFor="active" className="text-sm text-gray-700">
            Active
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          {initialData ? 'Update' : 'Create'} Geofence
        </Button>
      </div>
    </form>
  );
}