import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  FileText, 
  Settings,
  Building2
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Geofences', icon: MapPin, href: '/geofences' },
  { name: 'Employees', icon: Users, href: '/employees' },
  { name: 'Reports', icon: FileText, href: '/reports' },
  { name: 'Organization', icon: Building2, href: '/organization' },
  { name: 'Settings', icon: Settings, href: '/settings' }
];

export default function Sidebar({ className = '' }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`bg-white h-full w-64 border-r border-gray-200 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center px-6">
          <Link to="/" className="text-xl font-bold text-blue-600">
            GeoTrack
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 my-1
                  text-sm font-medium rounded-md
                  transition-colors duration-200
                  ${isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`
                  mr-3 h-5 w-5
                  ${isActive(item.href)
                    ? 'text-blue-500'
                    : 'text-gray-400'
                  }
                `} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">John Doe</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}