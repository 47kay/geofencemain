import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Users, Clock, AlertTriangle } from 'lucide-react';
import Stats from '../components/dashboard/Stats';
import ActivityLog from '../components/dashboard/ActivityLog';
import useGeofence from '../hooks/useGeofence';
import useAuth from '../hooks/useAuth';

export default function Dashboard() {
  const { organization } = useAuth();
  const { geofences } = useGeofence();

  const quickActions = [
    {
      title: 'Add Geofence',
      icon: MapPin,
      href: '/geofences/new',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Add Employee',
      icon: Users,
      href: '/employees/new',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'View Reports',
      icon: Clock,
      href: '/reports',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Alerts',
      icon: AlertTriangle,
      href: '/alerts',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {organization?.name}</h1>
        <p className="text-gray-500">Here's what's happening with your organization</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{action.title}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats */}
      <Stats />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityLog limit={5} />
        </CardContent>
      </Card>

      {/* Active Geofences Map */}
      <Card>
        <CardHeader>
          <CardTitle>Active Geofences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            {/* Map Component will be integrated here */}
            <p className="text-gray-500">Map view will be displayed here</p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Present Employees */}
        <Card>
          <CardHeader>
            <CardTitle>Present Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Employee list will be mapped here */}
              <p className="text-gray-500">Loading employees...</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Alerts will be mapped here */}
              <p className="text-gray-500">No recent alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}