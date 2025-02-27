import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

export default function EmployeeForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    department: initialData?.department || '',
    role: initialData?.role || '',
    assignedGeofence: initialData?.assignedGeofence || '',
    joiningDate: initialData?.joiningDate || '',
    employeeId: initialData?.employeeId || '',
    status: initialData?.status || 'active',
    emergencyContact: initialData?.emergencyContact || {
      name: '',
      relationship: '',
      phone: ''
    },
    address: initialData?.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  const [errors, setErrors] = useState({});

  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNestedChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.role.trim()) newErrors.role = 'Role is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            required
          />
        </div>
        <Input
          label="Employee ID"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleChange}
        />
      </div>

      {/* Work Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Work Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && (
              <p className="mt-1 text-sm text-red-600">{errors.department}</p>
            )}
          </div>
          <Input
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            error={errors.role}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Assigned Geofence"
            name="assignedGeofence"
            value={formData.assignedGeofence}
            onChange={handleChange}
          />
          <Input
            label="Joining Date"
            type="date"
            name="joiningDate"
            value={formData.joiningDate}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Emergency Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Contact Name"
            value={formData.emergencyContact.name}
            onChange={(e) => handleNestedChange('emergencyContact', 'name', e.target.value)}
          />
          <Input
            label="Relationship"
            value={formData.emergencyContact.relationship}
            onChange={(e) => handleNestedChange('emergencyContact', 'relationship', e.target.value)}
          />
        </div>
        <Input
          label="Contact Phone"
          type="tel"
          value={formData.emergencyContact.phone}
          onChange={(e) => handleNestedChange('emergencyContact', 'phone', e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Address</h3>
        <Input
          label="Street Address"
          value={formData.address.street}
          onChange={(e) => handleNestedChange('address', 'street', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City"
            value={formData.address.city}
            onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
          />
          <Input
            label="State/Province"
            value={formData.address.state}
            onChange={(e) => handleNestedChange('address', 'state', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ZIP/Postal Code"
            value={formData.address.zipCode}
            onChange={(e) => handleNestedChange('address', 'zipCode', e.target.value)}
          />
          <Input
            label="Country"
            value={formData.address.country}
            onChange={(e) => handleNestedChange('address', 'country', e.target.value)}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          {initialData ? 'Update' : 'Create'} Employee
        </Button>
      </div>
    </form>
  );
}