import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CreditCard, Building2, User } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';

export default function PaymentForm({ plan, billingCycle, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Payment Information
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    // Billing Information
    companyName: '',
    vatNumber: '',
    billingEmail: '',
    billingPhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e) => {
    const value = formatCardNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      cardNumber: value
    }));
  };

  const handleExpiryChange = (e) => {
    const value = formatExpiryDate(e.target.value);
    setFormData(prev => ({
      ...prev,
      expiryDate: value
    }));
  };

  const validatePaymentDetails = () => {
    const errors = {};
    if (!formData.cardName) errors.cardName = 'Cardholder name is required';
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
      errors.cardNumber = 'Valid card number is required';
    }
    if (!formData.expiryDate || formData.expiryDate.length !== 5) {
      errors.expiryDate = 'Valid expiry date is required';
    }
    if (!formData.cvv || formData.cvv.length !== 3) {
      errors.cvv = 'Valid CVV is required';
    }
    return errors;
  };

  const validateBillingDetails = () => {
    const errors = {};
    if (!formData.companyName) errors.companyName = 'Company name is required';
    if (!formData.billingEmail) errors.billingEmail = 'Billing email is required';
    if (!formData.address.street) errors.street = 'Street address is required';
    if (!formData.address.city) errors.city = 'City is required';
    if (!formData.address.zipCode) errors.zipCode = 'ZIP code is required';
    if (!formData.address.country) errors.country = 'Country is required';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement payment processing
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      onClose();
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">{plan.name} Plan</h3>
            <p className="text-sm text-gray-600">
              {billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">${plan.price}/month</div>
            {billingCycle === 'annual' && (
              <div className="text-sm text-green-600">Save 20%</div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Alert
          variant="error"
          message={error}
        />
      )}

      {/* Multi-step Form */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="w-16 h-1 bg-gray-200">
            <div
              className={`h-full bg-blue-600 transition-all ${
                step === 2 ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Information</h3>
            <Input
              label="Cardholder Name"
              name="cardName"
              value={formData.cardName}
              onChange={handleChange}
              placeholder="Name on card"
              required
            />
            <Input
              label="Card Number"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              maxLength="19"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                maxLength="5"
                required
              />
              <Input
                label="CVV"
                name="cvv"
                type="password"
                value={formData.cvv}
                onChange={handleChange}
                placeholder="123"
                maxLength="3"
                required
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Billing Information</h3>
            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
            />
            <Input
              label="VAT Number (Optional)"
              name="vatNumber"
              value={formData.vatNumber}
              onChange={handleChange}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Billing Email"
                type="email"
                name="billingEmail"
                value={formData.billingEmail}
                onChange={handleChange}
                required
              />
              <Input
                label="Billing Phone"
                type="tel"
                name="billingPhone"
                value={formData.billingPhone}
                onChange={handleChange}
              />
            </div>
            <Input
              label="Street Address"
              value={formData.address.street}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.address.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                required
              />
              <Input
                label="State/Province"
                value={formData.address.state}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ZIP/Postal Code"
                value={formData.address.zipCode}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                required
              />
              <Input
                label="Country"
                value={formData.address.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div className="flex justify-between">
          {step === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const errors = validatePaymentDetails();
                  if (Object.keys(errors).length === 0) {
                    setStep(2);
                  } else {
                    setError('Please fill in all payment details correctly.');
                  }
                }}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                Complete Purchase
              </Button>
            </>
          )}
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Your payment information is secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}