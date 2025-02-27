import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Check, HelpCircle } from 'lucide-react';
import Button from '../common/Button';

export default function PlanDetails({ plan, billingCycle, onClose, onSelectPlan }) {
  const featureDetails = {
    'Basic geofencing': 'Set up simple circular geofences around your locations',
    'Advanced geofencing': 'Create complex polygonal geofences with multiple zones',
    'Premium geofencing': 'Advanced geofencing with time-based rules and automation',
    'Basic analytics': 'View basic attendance reports and simple analytics',
    'Advanced analytics': 'Access detailed insights, trends, and custom reports',
    'Real-time tracking': 'Monitor employee attendance and location in real-time',
    'Basic integrations': 'Connect with popular HRIS and payroll systems',
    'Custom integrations': 'Build custom integrations with any system',
    'API access': 'Full access to our REST API for custom development'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{plan.name} Plan</h2>
        <p className="text-gray-600">
          {billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing at ${plan.price}/month
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <div className="font-medium">{feature}</div>
                    {featureDetails[feature] && (
                      <p className="text-sm text-gray-600 mt-1">
                        {featureDetails[feature]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  {plan.id === 'enterprise' ? 'Unlimited' : plan.features.find(f => f.includes('employees')).split(' ')[2]}
                </div>
                <div className="text-sm text-gray-600">Employees</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  {plan.id === 'enterprise' ? 'Unlimited' : plan.id === 'starter' ? '1' : '10'}
                </div>
                <div className="text-sm text-gray-600">Locations</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  {plan.id === 'enterprise' ? '24/7' : plan.id === 'professional' ? 'Priority' : 'Email'}
                </div>
                <div className="text-sm text-gray-600">Support</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  {plan.id === 'enterprise' ? 'Unlimited' : plan.id === 'professional' ? '5GB' : '1GB'}
                </div>
                <div className="text-sm text-gray-600">Storage</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <div className="font-medium">Free Trial Available</div>
                <p className="text-sm text-gray-600">
                  Start with a 14-day free trial to test all features
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <div className="font-medium">Flexible Billing</div>
                <p className="text-sm text-gray-600">
                  Switch between monthly and annual billing at any time
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <div className="font-medium">Cancel Anytime</div>
                <p className="text-sm text-gray-600">
                  No long-term contracts, cancel your subscription when needed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onSelectPlan}>
          Select Plan
        </Button>
      </div>
    </div>
  );
}