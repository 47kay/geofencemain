import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import Button from '../common/Button';
import PlanDetails from './PlanDetails';
import PaymentForm from './PaymentForm';
import Modal from '../common/Modal';

export default function PlanList() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = {
    monthly: [
      {
        id: 'starter',
        name: 'Starter',
        price: 49,
        features: [
          'Up to 25 employees',
          'Basic geofencing',
          'Attendance reports',
          'Email support'
        ],
        limits: [
          'Single location only',
          'Basic analytics',
          'No custom branding'
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 99,
        features: [
          'Up to 100 employees',
          'Advanced geofencing',
          'Real-time tracking',
          'Priority support',
          'Multiple locations',
          'Advanced analytics',
          'Basic integrations'
        ],
        limits: ['No custom branding']
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 199,
        features: [
          'Unlimited employees',
          'Premium geofencing',
          'Real-time tracking',
          '24/7 priority support',
          'Unlimited locations',
          'Advanced analytics',
          'Full API access',
          'Custom branding',
          'Custom integrations'
        ],
        limits: []
      }
    ],
    annual: [
      {
        id: 'starter',
        name: 'Starter',
        price: 39,
        features: [
          'Up to 25 employees',
          'Basic geofencing',
          'Attendance reports',
          'Email support'
        ],
        limits: [
          'Single location only',
          'Basic analytics',
          'No custom branding'
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 79,
        features: [
          'Up to 100 employees',
          'Advanced geofencing',
          'Real-time tracking',
          'Priority support',
          'Multiple locations',
          'Advanced analytics',
          'Basic integrations'
        ],
        limits: ['No custom branding']
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 159,
        features: [
          'Unlimited employees',
          'Premium geofencing',
          'Real-time tracking',
          '24/7 priority support',
          'Unlimited locations',
          'Advanced analytics',
          'Full API access',
          'Custom branding',
          'Custom integrations'
        ],
        limits: []
      }
    ]
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handleViewDetails = (plan) => {
    setSelectedPlan(plan);
    setShowPlanDetails(true);
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-600 mb-6">Select the perfect plan for your organization</p>
        
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md text-sm ${
              billingCycle === 'annual'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600'
            }`}
          >
            Annual
            <span className="ml-1 text-xs text-green-500">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans[billingCycle].map((plan) => (
          <Card 
            key={plan.id}
            className={`relative ${
              selectedPlan?.id === plan.id ? 'ring-2 ring-blue-600' : ''
            }`}
          >
            {plan.id === 'professional' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Features:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.limits.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Limitations:</h4>
                  <ul className="space-y-2">
                    {plan.limits.map((limit, index) => (
                      <li key={index} className="flex items-start">
                        <X className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handlePlanSelect(plan)}
                >
                  Select Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDetails(plan)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        title="Complete Subscription"
      >
        <PaymentForm
          plan={selectedPlan}
          billingCycle={billingCycle}
          onClose={() => setShowPaymentForm(false)}
        />
      </Modal>

      <Modal
        isOpen={showPlanDetails}
        onClose={() => setShowPlanDetails(false)}
        title="Plan Details"
      >
        <PlanDetails
          plan={selectedPlan}
          billingCycle={billingCycle}
          onClose={() => setShowPlanDetails(false)}
          onSelectPlan={() => {
            setShowPlanDetails(false);
            setShowPaymentForm(true);
          }}
        />
      </Modal>
    </div>
  );
}