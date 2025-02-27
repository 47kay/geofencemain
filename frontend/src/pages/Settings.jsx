import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Building2,
  CreditCard,
  Bell,
  Users,
  Lock,
  Globe,
  Mail,
  Smartphone,
  Slack,
  Chrome,
  Gitlab
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
import useAuth from '../hooks/useAuth';
import { Switch } from '../components/ui/switch';


export default function Settings() {
  const { organization, updateOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [orgSettings, setOrgSettings] = useState({
    name: organization?.name || '',
    email: organization?.email || '',
    phone: organization?.phone || '',
    address: organization?.address || '',
    website: organization?.website || '',
    timezone: organization?.timezone || '',
    logo: null
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    dailyReports: true,
    alertNotifications: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    requirePasswordChange: 90,
    sessionTimeout: 30,
    ipWhitelist: ''
  });

  const [billingSettings, setBillingSettings] = useState({
    plan: organization?.subscription?.plan || 'free',
    billingEmail: organization?.billingEmail || '',
    paymentMethod: null
  });

  const handleOrgSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateOrganization(orgSettings);
      setSuccess('Organization settings updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Implement notification settings update
      setSuccess('Notification settings updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [notifications, setNotifications] = useState({
    attendance: true,
    reports: true,
    geofence: true,
    system: true,
    mobile_attendance: true,
    mobile_geofence: true
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    minPasswordLength: '8',
    passwordExpiry: '90',
    sessionTimeout: '30'
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  const handleNotificationToggle = (id) => {
    setNotifications(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSecurityChange = (key, value) => {
    setSecurity(prev => ({
      ...prev,
      [key]: value
    }));
  };



  const handleForceLogout = async () => {
    try {
      setIsLoading(true);

      // First, show confirmation dialog
      const confirmed = window.confirm(
        "Are you sure you want to force logout all users? This will terminate all active sessions."
      );

      if (!confirmed) return;

      // Make API call to force logout all users
      const response = await fetch('/api/auth/force-logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to force logout users');
      }

      // Show success message
      setSuccess('All users have been logged out successfully');

      // Optional: Log current user out as well
      if (window.confirm('Do you want to log out of your current session as well?')) {
        await logout(); // assuming you have a logout function from useAuth
        navigate('/login');
      }

    } catch (error) {
      setError(error.message || 'Failed to force logout users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntegrationToggle = async (integrationId) => {
    try {
      setIsLoading(true);
      const currentStatus = integrations.find(i => i.id === integrationId)?.connected;

      if (currentStatus) {
        // Disconnect integration
        const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to disconnect ${integrationId}`);
        }

        // Update local state
        setIntegrations(prev =>
          prev.map(integration =>
            integration.id === integrationId
              ? { ...integration, connected: false }
              : integration
          )
        );

        setSuccess(`Successfully disconnected ${integrationId}`);
      } else {
        // Connect integration
        // For OAuth integrations, open OAuth window
        if (['google', 'slack', 'teams'].includes(integrationId)) {
          const width = 600;
          const height = 600;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;

          const oauthWindow = window.open(
            `/api/integrations/${integrationId}/authorize`,
            `Connect ${integrationId}`,
            `width=${width},height=${height},left=${left},top=${top}`
          );

          // Listen for OAuth completion
          window.addEventListener('message', async (event) => {
            if (event.data.type === 'OAUTH_COMPLETE' && event.data.integrationId === integrationId) {
              oauthWindow.close();

              if (event.data.success) {
                // Update local state
                setIntegrations(prev =>
                  prev.map(integration =>
                    integration.id === integrationId
                      ? { ...integration, connected: true }
                      : integration
                  )
                );
                setSuccess(`Successfully connected ${integrationId}`);
              } else {
                setError(`Failed to connect ${integrationId}: ${event.data.error}`);
              }
            }
          });
        } else {
          // For non-OAuth integrations, make direct API call
          const response = await fetch(`/api/integrations/${integrationId}/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to connect ${integrationId}`);
          }

          // Update local state
          setIntegrations(prev =>
            prev.map(integration =>
              integration.id === integrationId
                ? { ...integration, connected: true }
                : integration
            )
          );

          setSuccess(`Successfully connected ${integrationId}`);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSecuritySettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Implement security settings update
      setSuccess('Security settings updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'integrations', label: 'Integrations', icon: Globe }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your organization settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {error && <Alert variant="error" message={error} />}
        {success && <Alert variant="success" message={success} />}

        {activeTab === 'organization' && (
          <form onSubmit={handleOrgSettingsSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Organization Name"
                    name="name"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    required
                  />
                  <Input
                    label="Website"
                    name="website"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings(prev => ({
                      ...prev,
                      website: e.target.value
                    }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Contact Email"
                    type="email"
                    name="email"
                    value={orgSettings.email}
                    onChange={(e) => setOrgSettings(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    required
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    name="phone"
                    value={orgSettings.phone}
                    onChange={(e) => setOrgSettings(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <Input
                    label="Address"
                    name="address"
                    value={orgSettings.address}
                    onChange={(e) => setOrgSettings(prev => ({
                      ...prev,
                      address: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                      {orgSettings.logo ? (
                        <img
                          src={URL.createObjectURL(orgSettings.logo)}
                          alt="Organization logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setOrgSettings(prev => ({
                        ...prev,
                        logo: e.target.files[0]
                      }))}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrgSettings({
                  name: organization?.name || '',
                  email: organization?.email || '',
                  phone: organization?.phone || '',
                  address: organization?.address || '',
                  website: organization?.website || '',
                  timezone: organization?.timezone || '',
                  logo: null
                })}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-lg">Professional Plan</h3>
                      <p className="text-sm text-gray-600">$99/month</p>
                      <p className="text-sm text-gray-600">Billed monthly</p>
                    </div>
                    <Button variant="primary">Upgrade Plan</Button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Next Billing Date</p>
                      <p className="text-sm text-gray-600">March 15, 2024</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Users</p>
                      <p className="text-sm text-gray-600">45 of 100</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Geofences</p>
                      <p className="text-sm text-gray-600">8 of 10</p>
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
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center">
                    <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-500">Expires 12/24</p>
                    </div>
                  </div>
                  <Button variant="outline">Update</Button>
                </div>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { date: '2024-02-15', amount: 99, status: 'paid', invoice: '#INV-001' },
                    { date: '2024-01-15', amount: 99, status: 'paid', invoice: '#INV-002' },
                    { date: '2023-12-15', amount: 99, status: 'paid', invoice: '#INV-003' },
                  ].map((bill) => (
                    <div key={bill.invoice} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{bill.invoice}</p>
                        <p className="text-sm text-gray-500">{new Date(bill.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-sm ${bill.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {bill.status}
                        </span>
                        <p className="font-medium">${bill.amount}</p>
                        <Button variant="outline" size="sm">Download</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: 'attendance', label: 'Attendance Alerts', description: 'Get notified when employees are late or absent' },
                    { id: 'reports', label: 'Daily Reports', description: 'Receive daily attendance summary reports' },
                    { id: 'geofence', label: 'Geofence Alerts', description: 'Notifications for geofence entry and exit' },
                    { id: 'system', label: 'System Updates', description: 'Updates about system maintenance and new features' },
                  ].map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{notification.label}</p>
                        <p className="text-sm text-gray-500">{notification.description}</p>
                      </div>
                      <Switch
                        checked={notifications[notification.id]}
                        onChange={() => handleNotificationToggle(notification.id)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: 'mobile_attendance', label: 'Mobile Attendance Alerts', description: 'Real-time notifications on your mobile device' },
                    { id: 'mobile_geofence', label: 'Mobile Geofence Alerts', description: 'Location-based alerts on your mobile device' },
                  ].map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{notification.label}</p>
                        <p className="text-sm text-gray-500">{notification.description}</p>
                      </div>
                      <Switch
                        checked={notifications[notification.id]}
                        onChange={() => handleNotificationToggle(notification.id)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant={security.twoFactor ? 'outline' : 'primary'}>
                      {security.twoFactor ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Password Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Password Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Password Length
                    </label>
                    <select
                      value={security.minPasswordLength}
                      onChange={(e) => handleSecurityChange('minPasswordLength', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                    >
                      <option value="8">8 characters</option>
                      <option value="10">10 characters</option>
                      <option value="12">12 characters</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password Expiry
                    </label>
                    <select
                      value={security.passwordExpiry}
                      onChange={(e) => handleSecurityChange('passwordExpiry', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                    >
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Management */}
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Timeout
                    </label>
                    <select
                      value={security.sessionTimeout}
                      onChange={(e) => handleSecurityChange('sessionTimeout', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                    </select>
                  </div>
                  <Button variant="outline" onClick={handleForceLogout}>
                    Force Logout All Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* Available Integrations */}
            <Card>
              <CardHeader>
                <CardTitle>Available Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: 'slack',
                      name: 'Slack',
                      description: 'Send attendance notifications to Slack channels',
                      connected: true,
                      icon: Slack
                    },
                    {
                      id: 'teams',
                      name: 'Microsoft Teams',
                      description: 'Integrate with Microsoft Teams',
                      connected: false,
                      icon: Gitlab
                    },
                    {
                      id: 'google',
                      name: 'Google Calendar',
                      description: 'Sync attendance with Google Calendar',
                      connected: false,
                      icon: Chrome
                    },
                  ].map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100">
                          <integration.icon className="w-6 h-6" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-sm text-gray-500">{integration.description}</p>
                        </div>
                      </div>
                      <Button
                        variant={integration.connected ? 'outline' : 'primary'}
                        onClick={() => handleIntegrationToggle(integration.id)}
                      >
                        {integration.connected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* API Access */}
            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">API Key</p>
                    <div className="flex items-center mt-2">
                      <input
                        type="password"
                        value="••••••••••••••••"
                        readOnly
                        className="flex-1 rounded-md border-gray-300"
                      />
                      <Button variant="outline" className="ml-2">
                        Copy
                      </Button>
                      <Button variant="outline" className="ml-2">
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Webhook URL</p>
                    <div className="flex items-center mt-2">
                      <input
                        type="text"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="flex-1 rounded-md border-gray-300"
                        placeholder="https://your-domain.com/webhook"
                      />
                      <Button variant="outline" className="ml-2">
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


      </div>
    </div>
  );
}