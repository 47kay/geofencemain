import React from 'react';
import { MapPin, LogIn, LogOut, AlertTriangle, Settings, UserPlus } from 'lucide-react';

const activityTypes = {
  entry: {
    icon: LogIn,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  exit: {
    icon: LogOut,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  geofence: {
    icon: MapPin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  settings: {
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  employee: {
    icon: UserPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
};

export default function ActivityLog({ limit = 10 }) {
  // Sample data - replace with real data
  const activities = [
    {
      id: 1,
      type: 'entry',
      user: 'John Doe',
      location: 'Main Office',
      time: '2024-02-12T09:00:00',
      description: 'Checked in at Main Office'
    },
    {
      id: 2,
      type: 'alert',
      user: 'Jane Smith',
      location: 'Branch Office',
      time: '2024-02-12T08:45:00',
      description: 'Late arrival detected'
    },
    {
      id: 3,
      type: 'geofence',
      user: 'Admin',
      location: 'New Location',
      time: '2024-02-12T08:30:00',
      description: 'Added new geofence: Downtown Office'
    },
    {
      id: 4,
      type: 'exit',
      user: 'Mike Johnson',
      location: 'Main Office',
      time: '2024-02-12T17:00:00',
      description: 'Checked out from Main Office'
    },
    {
      id: 5,
      type: 'employee',
      user: 'Admin',
      location: 'System',
      time: '2024-02-12T14:30:00',
      description: 'Added new employee: Sarah Wilson'
    }
  ];

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.floor((date - new Date()) / (1000 * 60)),
      'minutes'
    );
  };

  return (
    <div className="space-y-4">
      {activities.slice(0, limit).map((activity) => {
        const ActivityIcon = activityTypes[activity.type].icon;
        return (
          <div key={activity.id} className="flex items-start space-x-4">
            <div className={`p-2 rounded-lg ${activityTypes[activity.type].bgColor}`}>
              <ActivityIcon className={`h-5 w-5 ${activityTypes[activity.type].color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span>{activity.user}</span>
                <span className="mx-2">&bull;</span>
                <span>{activity.location}</span>
                <span className="mx-2">&bull;</span>
                <span>{formatTime(activity.time)}</span>
              </div>
            </div>
          </div>
        );
      })}

      {activities.length > limit && (
        <div className="text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}