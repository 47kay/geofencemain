import React from 'react';
import Stats from './Stats';
import ActivityLog from './ActivityLog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Users, Clock, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Overview of your organization's attendance</p>
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

      {/* Live Map - Placeholder for geofence overview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Map view coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}