import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import * as Label from '@radix-ui/react-label';
import api from '../lib/axios';

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { company, refreshCompany } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    kvk: '',
    btw: '',
    iban: '',
    address: '',
  });

  // Pre-fill form data if company exists
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        kvk: company.kvk || '',
        btw: company.btw || '',
        iban: company.iban || '',
        address: company.address || '',
      });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.put('/api/users/me/company', formData);
      await refreshCompany();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save company details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {company ? 'Edit Company Details' : 'Complete Your Profile'}
          </h1>
          <p className="text-slate-600">
            {company
              ? 'Update your company information below.'
              : 'Please provide your company details to continue using the bookkeeping application.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label.Root htmlFor="name">Company Name</Label.Root>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Company B.V."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="kvk">KvK Nummer</Label.Root>
              <input
                id="kvk"
                name="kvk"
                type="text"
                required
                value={formData.kvk}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label.Root htmlFor="btw">BTW-nummer</Label.Root>
              <input
                id="btw"
                name="btw"
                type="text"
                required
                value={formData.btw}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="NL123456789B01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="iban">IBAN</Label.Root>
            <input
              id="iban"
              name="iban"
              type="text"
              required
              value={formData.iban}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="NL12ABCD0123456789"
            />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="address">Company Address</Label.Root>
            <textarea
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Street name 123&#10;1234 AB Amsterdam"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            {company && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
                size="lg"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={company ? 'flex-1' : 'w-full'}
              size="lg"
            >
              {isSubmitting ? 'Saving...' : (company ? 'Save Changes' : 'Continue to Dashboard')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
