import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Edit2, Trash2, CheckCircle, XCircle, MapPin } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import EmployeeForm from './EmployeeForm';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      department: 'Engineering',
      role: 'Software Engineer',
      status: 'active',
      assignedGeofence: 'Main Office',
      joiningDate: '2024-01-15',
      lastActive: '2024-02-12T09:00:00'
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567891',
      department: 'Marketing',
      role: 'Marketing Manager',
      status: 'active',
      assignedGeofence: 'Branch Office',
      joiningDate: '2024-01-20',
      lastActive: '2024-02-12T08:45:00'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (id) => {
    setEmployees(employees.filter(e => e.id !== id));
    setShowDeleteConfirm(false);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setShowForm(true);
  };

  const handleFormSubmit = (formData) => {
    if (selectedEmployee) {
      setEmployees(employees.map(e =>
        e.id === selectedEmployee.id ? { ...e, ...formData } : e
      ));
    } else {
      setEmployees([...employees, {
        ...formData,
        id: employees.length + 1,
        status: 'active',
        lastActive: new Date().toISOString()
      }]);
    }
    setShowForm(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-gray-500">Manage your organization's employees</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedEmployee(null);
            setShowForm(true);
          }}
        >
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-600">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-gray-500">{employee.role}</p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        {employee.department}
                      </span>
                      <span className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {employee.assignedGeofence}
                      </span>
                      <span
                        className={`flex items-center text-sm ${
                          employee.status === 'active' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {employee.status === 'active' ? (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {employee.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(employee)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedEmployee(null);
        }}
        title={selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
      >
        <EmployeeForm
          initialData={selectedEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedEmployee(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Employee"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete this employee? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(selectedEmployee?.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}