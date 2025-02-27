import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Users, Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';
import GeofenceMap from './GeofenceMap';

export default function GeofenceDetails({ geofence }) {
  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{geofence.name}</h2>
          <p className="text-gray-500">{geofence.address}</p>
        </div>
        <div className={`px-3 py-1 rounded-full ${
          geofence.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {geofence.active ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Map Card */}
        <div className="md:col-span-2">
          <GeofenceMap
            selectedGeofence={geofence}
            editable={false}
          />
        </div>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Geofence Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>Radius: {geofence.radius} meters</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="h-5 w-5" />
              <span>{geofence.employeeCount} employees assigned</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="h-5 w-5" />
              <span>
                Working Hours: {formatTime(geofence.workingHours.start)} - {formatTime(geofence.workingHours.end)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="h-5 w-5" />
                <span>Allowed Days:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {geofence.allowedDays.map(day => (
                  <span
                    key={day}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-green-600 text-2xl font-semibold">
                  {geofence.stats?.presentCount || 0}
                </div>
                <div className="text-sm text-gray-600">Present</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-red-600 text-2xl font-semibold">
                  {geofence.stats?.absentCount || 0}
                </div>
                <div className="text-sm text-gray-600">Absent</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-orange-600 text-2xl font-semibold">
                  {geofence.stats?.lateCount || 0}
                </div>
                <div className="text-sm text-gray-600">Late</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-blue-600 text-2xl font-semibold">
                  {geofence.stats?.leaveCount || 0}
                </div>
                <div className="text-sm text-gray-600">On Leave</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {(geofence.recentActivity || []).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {activity.type === 'entry' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm text-gray-900">{activity.employee}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}