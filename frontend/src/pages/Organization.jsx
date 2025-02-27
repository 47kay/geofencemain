// frontend/src/pages/Organization.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Building2,
    Users,
    MapPin,
    Phone,
    CreditCard,
    Download,
    Plus,
    Receipt,
    Mail,
    Globe,
    Clock,
    Upload
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
import useAuth from '../hooks/useAuth';

export default function Organization() {
    const { organization, updateOrganization } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // general, locations, departments, billing

    const [newLocation, setNewLocation] = useState({
        name: '',
        type: '',
        address: '',
        contactPerson: '',
        contactPhone: '',
        coordinates: null
    });

    const handleAddLocation = async () => {
        if (!newLocation.name || !newLocation.address) return;

        setIsLoading(true);
        try {
            // TODO: API call to add location
            setOrgData(prev => ({
                ...prev,
                locations: [...(prev.locations || []), {
                    id: Date.now(),
                    ...newLocation,
                    active: true,
                    employeeCount: 0,
                    geofenceCount: 0,
                    presentToday: 0
                }]
            }));
            setNewLocation({
                name: '',
                type: '',
                address: '',
                contactPerson: '',
                contactPhone: '',
                coordinates: null
            });
        } catch (error) {
            setError('Failed to add location');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditLocation = (location) => {
        // Implement location editing
    };

    const handleToggleLocationStatus = (locationId) => {
        setOrgData(prev => ({
            ...prev,
            locations: prev.locations.map(loc =>
                loc.id === locationId ? { ...loc, active: !loc.active } : loc
            )
        }));
    };

    const handleDeleteLocation = (locationId) => {
        setOrgData(prev => ({
            ...prev,
            locations: prev.locations.filter(loc => loc.id !== locationId)
        }));
    };

    const [orgData, setOrgData] = useState({
        name: organization?.name || '',
        email: organization?.email || '',
        phone: organization?.phone || '',
        website: organization?.website || '',
        address: organization?.address || '',
        logo: null,
        timezone: organization?.timezone || 'UTC',
        businessHours: organization?.businessHours || {
            start: '09:00',
            end: '17:00',
            workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
        departments: organization?.departments || []
    });

    const [newDepartment, setNewDepartment] = useState({
        name: '',
        manager: '',
        description: ''
    });

    const timezones = [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Tokyo'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOrgData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setOrgData(prev => ({
                ...prev,
                logo: file
            }));
        }
    };

    const handleBusinessHoursChange = (e) => {
        const { name, value } = e.target;
        setOrgData(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                [name]: value
            }
        }));
    };

    const handleWorkDayToggle = (day) => {
        setOrgData(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                workDays: prev.businessHours.workDays.includes(day)
                    ? prev.businessHours.workDays.filter(d => d !== day)
                    : [...prev.businessHours.workDays, day]
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await updateOrganization(orgData);
            setSuccess('Organization details updated successfully');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddDepartment = () => {
        if (!newDepartment.name) return;

        setOrgData(prev => ({
            ...prev,
            departments: [...prev.departments, { ...newDepartment, id: Date.now() }]
        }));

        setNewDepartment({
            name: '',
            manager: '',
            description: ''
        });
    };

    const handleRemoveDepartment = (departmentId) => {
        setOrgData(prev => ({
            ...prev,
            departments: prev.departments.filter(dept => dept.id !== departmentId)
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Organization Settings</h1>
                <p className="text-gray-500">Manage your organization's details and preferences</p>
            </div>

            {error && <Alert variant="error" message={error} />}
            {success && <Alert variant="success" message={success} />}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'general'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('locations')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'locations'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Locations
                    </button>
                    <button
                        onClick={() => setActiveTab('departments')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'departments'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Departments
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'billing'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Billing
                    </button>
                </nav>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'general' && (
                    <>
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-24 h-24 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                                        {orgData.logo ? (
                                            <img
                                                src={URL.createObjectURL(orgData.logo)}
                                                alt="Organization logo"
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        ) : (
                                            <Building2 className="w-12 h-12 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                            id="logo-upload"
                                        />
                                        <label
                                            htmlFor="logo-upload"
                                            className="btn btn-outline flex items-center cursor-pointer"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload Logo
                                        </label>
                                    </div>
                                </div>

                                <Input
                                    label="Organization Name"
                                    name="name"
                                    value={orgData.name}
                                    onChange={handleInputChange}
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Email"
                                        type="email"
                                        name="email"
                                        value={orgData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <Input
                                        label="Phone"
                                        type="tel"
                                        name="phone"
                                        value={orgData.phone}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <Input
                                    label="Website"
                                    name="website"
                                    value={orgData.website}
                                    onChange={handleInputChange}
                                />

                                <Input
                                    label="Address"
                                    name="address"
                                    value={orgData.address}
                                    onChange={handleInputChange}
                                    multiline
                                    rows={3}
                                />
                            </CardContent>
                        </Card>

                        {/* Business Hours */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Business Hours</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="time"
                                        label="Start Time"
                                        name="start"
                                        value={orgData.businessHours.start}
                                        onChange={handleBusinessHoursChange}
                                    />
                                    <Input
                                        type="time"
                                        label="End Time"
                                        name="end"
                                        value={orgData.businessHours.end}
                                        onChange={handleBusinessHoursChange}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Work Days
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => handleWorkDayToggle(day)}
                                                className={`px-3 py-1 rounded-full text-sm ${orgData.businessHours.workDays.includes(day)
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Timezone
                                    </label>
                                    <select
                                        name="timezone"
                                        value={orgData.timezone}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}



                {activeTab === 'departments' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Departments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add New Department */}
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    placeholder="Department Name"
                                    value={newDepartment.name}
                                    onChange={(e) => setNewDepartment(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                />
                                <Input
                                    placeholder="Manager"
                                    value={newDepartment.manager}
                                    onChange={(e) => setNewDepartment(prev => ({
                                        ...prev,
                                        manager: e.target.value
                                    }))}
                                />
                                <Button
                                    type="button"
                                    onClick={handleAddDepartment}
                                    disabled={!newDepartment.name}
                                >
                                    Add Department
                                </Button>
                            </div>

                            {/* Department List */}
                            <div className="space-y-4">
                                {orgData.departments.map(dept => (
                                    <div
                                        key={dept.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <h3 className="font-medium">{dept.name}</h3>
                                            {dept.manager && (
                                                <p className="text-sm text-gray-500">
                                                    Manager: {dept.manager}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleRemoveDepartment(dept.id)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'locations' && (
                    <div className="space-y-6">
                        {/* Add New Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Add New Location</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Location Name"
                                        name="name"
                                        placeholder="e.g., Main Office, Branch Office"
                                        value={newLocation.name}
                                        onChange={(e) => setNewLocation(prev => ({
                                            ...prev,
                                            name: e.target.value
                                        }))}
                                    />
                                    <Input
                                        label="Location Type"
                                        name="type"
                                        placeholder="e.g., Office, Warehouse, Store"
                                        value={newLocation.type}
                                        onChange={(e) => setNewLocation(prev => ({
                                            ...prev,
                                            type: e.target.value
                                        }))}
                                    />
                                    <div className="col-span-2">
                                        <Input
                                            label="Address"
                                            name="address"
                                            placeholder="Full address"
                                            value={newLocation.address}
                                            onChange={(e) => setNewLocation(prev => ({
                                                ...prev,
                                                address: e.target.value
                                            }))}
                                        />
                                    </div>
                                    <Input
                                        label="Contact Person"
                                        name="contactPerson"
                                        value={newLocation.contactPerson}
                                        onChange={(e) => setNewLocation(prev => ({
                                            ...prev,
                                            contactPerson: e.target.value
                                        }))}
                                    />
                                    <Input
                                        label="Contact Phone"
                                        name="contactPhone"
                                        type="tel"
                                        value={newLocation.contactPhone}
                                        onChange={(e) => setNewLocation(prev => ({
                                            ...prev,
                                            contactPhone: e.target.value
                                        }))}
                                    />
                                    {/* Map Preview */}
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Location on Map
                                        </label>
                                        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <p className="text-gray-500">Map will be displayed here</p>
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleAddLocation}
                                            disabled={!newLocation.name || !newLocation.address}
                                        >
                                            Add Location
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Existing Locations */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Locations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {orgData.locations?.map((location) => (
                                        <div
                                            key={location.id}
                                            className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center">
                                                        <h3 className="font-medium text-lg">{location.name}</h3>
                                                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${location.active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {location.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-500">{location.type}</p>
                                                    <p className="text-sm flex items-center">
                                                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                                        {location.address}
                                                    </p>
                                                    {location.contactPerson && (
                                                        <p className="text-sm flex items-center">
                                                            <User className="h-4 w-4 mr-1 text-gray-400" />
                                                            {location.contactPerson}
                                                            {location.contactPhone && (
                                                                <span className="ml-2 flex items-center">
                                                                    <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                                                    {location.contactPhone}
                                                                </span>
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditLocation(location)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleToggleLocationStatus(location.id)}
                                                    >
                                                        {location.active ? (
                                                            <X className="h-4 w-4 text-red-500" />
                                                        ) : (
                                                            <Check className="h-4 w-4 text-green-500" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteLocation(location.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Location Stats */}
                                            <div className="mt-4 grid grid-cols-3 gap-4">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Employees</p>
                                                    <p className="text-lg font-medium">{location.employeeCount || 0}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Geofences</p>
                                                    <p className="text-lg font-medium">{location.geofenceCount || 0}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Present Today</p>
                                                    <p className="text-lg font-medium">{location.presentToday || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!orgData.locations || orgData.locations.length === 0) && (
                                        <div className="text-center py-12">
                                            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">No locations</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Get started by adding a new location.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        {/* Subscription Overview */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Subscription</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold">Professional Plan</h3>
                                            <p className="text-sm text-gray-600 mt-1">Billed Monthly</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold">$99</p>
                                            <p className="text-sm text-gray-600">per month</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Employees</p>
                                            <p className="mt-1 text-xl font-semibold">45/100</p>
                                            <div className="mt-1 h-2 bg-gray-200 rounded-full">
                                                <div className="h-2 bg-blue-600 rounded-full" style={{ width: '45%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Geofences</p>
                                            <p className="mt-1 text-xl font-semibold">8/10</p>
                                            <div className="mt-1 h-2 bg-gray-200 rounded-full">
                                                <div className="h-2 bg-blue-600 rounded-full" style={{ width: '80%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Next Billing</p>
                                            <p className="mt-1 text-xl font-semibold">Mar 15, 2024</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Method */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Method</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-gray-100 p-2 rounded-md">
                                                <CreditCard className="h-6 w-6 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Visa ending in 4242</p>
                                                <p className="text-sm text-gray-500">Expires 12/2024</p>
                                            </div>
                                        </div>
                                        <Button variant="outline">Update</Button>
                                    </div>

                                    <Button variant="outline" className="w-full">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Payment Method
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Billing History */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Billing History</CardTitle>
                                <Button variant="outline">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        {
                                            id: 1,
                                            date: '2024-02-15',
                                            amount: 99.00,
                                            status: 'Paid',
                                            invoice: 'INV-2024-002'
                                        },
                                        {
                                            id: 2,
                                            date: '2024-01-15',
                                            amount: 99.00,
                                            status: 'Paid',
                                            invoice: 'INV-2024-001'
                                        },
                                        {
                                            id: 3,
                                            date: '2023-12-15',
                                            amount: 99.00,
                                            status: 'Paid',
                                            invoice: 'INV-2023-012'
                                        }
                                    ].map((bill) => (
                                        <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center space-x-4">
                                                <div className="bg-gray-100 p-2 rounded-md">
                                                    <Receipt className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{bill.invoice}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(bill.date).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className={`px-2 py-1 rounded-full text-sm ${bill.status === 'Paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {bill.status}
                                                </span>
                                                <p className="font-medium">${bill.amount.toFixed(2)}</p>
                                                <Button variant="ghost" size="sm">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Plan Upgrade */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Need More Resources?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <p className="text-gray-600 mb-4">
                                        Upgrade your plan to get more employees, geofences, and features.
                                    </p>
                                    <Button variant="primary">
                                        View Plans & Upgrade
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            // Reset form
                            setOrgData({
                                name: organization?.name || '',
                                email: organization?.email || '',
                                phone: organization?.phone || '',
                                website: organization?.website || '',
                                address: organization?.address || '',
                                logo: null,
                                timezone: organization?.timezone || 'UTC',
                                businessHours: organization?.businessHours || {
                                    start: '09:00',
                                    end: '17:00',
                                    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                                },
                                departments: organization?.departments || []
                            });
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isLoading}
                    >
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}