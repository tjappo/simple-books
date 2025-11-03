import { useState, useEffect } from 'react';
import axios from 'axios';
import * as Label from '@radix-ui/react-label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/Dialog';
import { Button } from '../components/Button';
import { Separator } from '../components/Separator';

interface Customer {
  id: string;
  type: 'PERSONAL' | 'BUSINESS';
  name: string;
  email: string;
  phone?: string;
  address: string;
  kvk?: string;
  btw?: string;
  createdAt: string;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    type: 'PERSONAL' as 'PERSONAL' | 'BUSINESS',
    name: '',
    email: '',
    phone: '',
    address: '',
    kvk: '',
    btw: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      type: customer.type,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address,
      kvk: customer.kvk || '',
      btw: customer.btw || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await axios.delete(`/api/customers/${id}`);
      await fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. They may have associated invoices.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        ...formData,
        phone: formData.phone || undefined,
        kvk: formData.type === 'BUSINESS' ? formData.kvk : undefined,
        btw: formData.type === 'BUSINESS' && formData.btw ? formData.btw : undefined,
      };

      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, data);
      } else {
        await axios.post('/api/customers', data);
      }

      await fetchCustomers();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'PERSONAL',
      name: '',
      email: '',
      phone: '',
      address: '',
      kvk: '',
      btw: '',
    });
    setEditingCustomer(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
      (customer.kvk && customer.kvk.toLowerCase().includes(searchLower)) ||
      (customer.btw && customer.btw.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="mt-1 text-gray-600">Manage your personal and business customers</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>Add Customer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                <DialogDescription>
                  {editingCustomer ? 'Update customer information.' : 'Create a new customer for invoicing.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="type">Customer Type</Label.Root>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PERSONAL">Personal</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="name">
                      {formData.type === 'BUSINESS' ? 'Company Name' : 'Full Name'}
                    </Label.Root>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.type === 'BUSINESS' ? 'Company B.V.' : 'John Doe'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label.Root htmlFor="email">Email</Label.Root>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label.Root htmlFor="phone">Phone (Optional)</Label.Root>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+31 6 12345678"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="address">Address</Label.Root>
                    <textarea
                      id="address"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleFormChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Street 123&#10;1234 AB Amsterdam&#10;Netherlands"
                    />
                  </div>

                  {formData.type === 'BUSINESS' && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label.Root htmlFor="kvk">KvK Number</Label.Root>
                          <input
                            id="kvk"
                            name="kvk"
                            type="text"
                            required={formData.type === 'BUSINESS'}
                            value={formData.kvk}
                            onChange={handleFormChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="12345678"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label.Root htmlFor="btw">BTW/VAT Number (Optional)</Label.Root>
                          <input
                            id="btw"
                            name="btw"
                            type="text"
                            value={formData.btw}
                            onChange={handleFormChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="NL123456789B01"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingCustomer ? 'Save Changes' : 'Add Customer')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers by name, email, phone, KvK, or BTW number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-600">Loading customers...</p>
            </CardContent>
          </Card>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-4 text-sm text-gray-600">
                No customers yet. Add your first customer to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {customer.name}
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          customer.type === 'BUSINESS'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {customer.type}
                        </span>
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                    {customer.phone && (
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="font-medium whitespace-pre-line">{customer.address}</p>
                    </div>
                    {customer.type === 'BUSINESS' && (
                      <>
                        <div>
                          <p className="text-gray-500">KvK</p>
                          <p className="font-medium">{customer.kvk}</p>
                        </div>
                        {customer.btw && (
                          <div>
                            <p className="text-gray-500">BTW/VAT</p>
                            <p className="font-medium">{customer.btw}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(customer)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(customer.id)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
