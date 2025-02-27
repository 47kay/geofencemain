import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Clock, Shield } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: MapPin,
      title: 'Advanced Geofencing',
      description: 'Set up virtual boundaries with customizable radius and real-time monitoring.'
    },
    {
      icon: Users,
      title: 'Employee Management',
      description: 'Track attendance, manage schedules, and monitor workforce efficiency.'
    },
    {
      icon: Clock,
      title: 'Real-time Tracking',
      description: 'Monitor attendance and location data in real-time with instant notifications.'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with data encryption and privacy compliance.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Modern Attendance Management with Geofencing
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Streamline your workforce management with accurate location-based attendance tracking
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="btn bg-white text-blue-600 hover:bg-blue-50"
              >
                Get Started
              </Link>
              <Link
                to="/contact"
                className="btn bg-transparent border-2 border-white hover:bg-white/10"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to manage attendance
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features to streamline your workforce management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to streamline your attendance management?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of organizations already using our platform
            </p>
            <Link
              to="/register"
              className="btn bg-white text-blue-600 hover:bg-blue-50"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}