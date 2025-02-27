import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  User, Mail, Phone, MapPin, Calendar, Clock, 
  Briefcase, Building, AlertTriangle, CheckCircle,
  XCircle, AlertOctagon
} from 'lucide-react';

export default function EmployeeDetails({ employee }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xl font-medium text-gray-600">
              {employee.firstName[0]}{employee.lastName[0]}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-gray-500">{employee.role}</p>
            <p className="text-sm text-gray-500">Employee ID: {employee.employeeId}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full ${
          employee.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {employee.status === 'active' ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span>{employee.phone}</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span>
                {employee.address?.street}, 
                {employee.address?.city}, 
                {employee.address?.state} {employee.address?.zipCode}, 
                {employee.address?.country}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Work Information */}
        <Card>
          <CardHeader>
            <CardTitle>Work Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-400" />
              <span>{employee.department}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <span>{employee.role}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span>Joined {formatDate(employee.joiningDate)}</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span>{employee.assignedGeofence}</span>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <span>{employee.emergencyContact?.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span>{employee.emergencyContact?.phone}</span>
            </div>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-gray-400" />
              <span>{employee.emergencyContact?.relationship}</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-green-600 text-2xl font-semibold">
                  {employee.stats?.presentDays || 0}
                </div>
                <div className="text-sm text-gray-600">Present Days</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-red-600 text-2xl font-semibold">
                  {employee.stats?.absentDays || 0}
                </div>
                <div className="text-sm text-gray-600">Absent Days</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-orange-600 text-2xl font-semibold">
                  {employee.stats?.lateDays || 0}
                </div>
                <div className="text-sm text-gray-600">Late Days</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-blue-600 text-2xl font-semibold">
                  {employee.stats?.onTime || 0}%
                </div>
                <div className="text-sm text-gray-600">On Time Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(employee.recentActivity || []).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {activity.type === 'entry' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {activity.type === 'exit' && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {activity.type === 'late' && (
                    <AlertOctagon className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}