import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Button from '../common/Button';
import { MapPin, Search } from 'lucide-react';

export default function GeofenceMap({ 
  selectedGeofence,
  onGeofenceSelect,
  onRadiusChange,
  editable = false 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [radius, setRadius] = useState(selectedGeofence?.radius || 100);

  useEffect(() => {
    if (selectedGeofence) {
      setCenter(selectedGeofence.coordinates);
      setRadius(selectedGeofence.radius);
    }
  }, [selectedGeofence]);

  const handleSearch = async () => {
    // TODO: Implement geocoding using a service like Google Maps Geocoding API
    console.log('Searching for:', searchQuery);
  };

  const handleMapClick = (event) => {
    if (editable) {
      // Get coordinates from map click event
      const newCoordinates = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      onGeofenceSelect(newCoordinates);
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Location</CardTitle>
          {editable && (
            <div className="flex space-x-2 w-64">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search address..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <Button onClick={handleSearch} variant="primary">
                Search
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Container */}
          <div className="h-[400px] bg-gray-100 rounded-lg relative">
            {/* Placeholder for actual map implementation */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Map Component Placeholder
              {/* Here you would integrate with a mapping service like Google Maps */}
            </div>
          </div>

          {/* Radius Control */}
          {editable && (
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Radius (meters):</label>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={radius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12">{radius}m</span>
            </div>
          )}

          {/* Selected Location Info */}
          {center && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>
                Lat: {center.lat.toFixed(6)}, Lng: {center.lng.toFixed(6)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}