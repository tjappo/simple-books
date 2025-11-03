import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/Dialog';
import { Button } from '../components/Button';
import * as Label from '@radix-ui/react-label';
import axios from 'axios';

interface Invoice {
  id: string;
  invoiceNumber: string;
  counterparty: string;
  issueDate: string;
  type: string;
}

interface Asset {
  id: string;
  name: string;
  description?: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  invoiceId?: string;
  invoice?: Invoice;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
  depreciationRate: number;
  usefulLife: number;
  residualValue: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  status: 'ACTIVE' | 'DISPOSED' | 'SOLD' | 'FULLY_DEPRECIATED';
  notes?: string;
}

interface DepreciationScheduleEntry {
  year: number;
  startingBookValue: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
}

export function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [invoiceSearchDialog, setInvoiceSearchDialog] = useState(false);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [schedule, setSchedule] = useState<DepreciationScheduleEntry[]>([]);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: string;
    purchaseDate: string;
    purchasePrice: number;
    invoiceId: string;
    depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
    depreciationRate: number;
    usefulLife: number;
    residualValue: number;
    notes: string;
  }>({
    name: '',
    description: '',
    category: '',
    purchaseDate: '',
    purchasePrice: 0,
    invoiceId: '',
    depreciationMethod: 'STRAIGHT_LINE',
    depreciationRate: 20,
    usefulLife: 5,
    residualValue: 0,
    notes: '',
  });

  useEffect(() => {
    fetchAssets();
    fetchInvoices();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await axios.get('/api/assets');
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('/api/invoices');
      // Filter to only show PURCHASE invoices
      const purchaseInvoices = response.data.filter((inv: any) => inv.type === 'PURCHASE');
      setInvoices(purchaseInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await axios.put(`/api/assets/${editingAsset.id}`, formData);
      } else {
        await axios.post('/api/assets', formData);
      }
      await fetchAssets();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      purchaseDate: '',
      purchasePrice: 0,
      invoiceId: '',
      depreciationMethod: 'STRAIGHT_LINE',
      depreciationRate: 20,
      usefulLife: 5,
      residualValue: 0,
      notes: '',
    });
    setEditingAsset(null);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description || '',
      category: asset.category,
      purchaseDate: asset.purchaseDate.split('T')[0],
      purchasePrice: asset.purchasePrice,
      invoiceId: asset.invoiceId || '',
      depreciationMethod: asset.depreciationMethod,
      depreciationRate: asset.depreciationRate,
      usefulLife: asset.usefulLife,
      residualValue: asset.residualValue,
      notes: asset.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await axios.delete(`/api/assets/${id}`);
      await fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset');
    }
  };

  const handleViewSchedule = async (asset: Asset) => {
    try {
      const response = await axios.get(`/api/assets/${asset.id}/schedule`);
      setSchedule(response.data.schedule);
      setSelectedAsset(asset);
      setScheduleDialog(true);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      alert('Failed to load depreciation schedule');
    }
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    setFormData(prev => ({ ...prev, invoiceId: invoice.id }));
    setInvoiceSearchDialog(false);
    setInvoiceSearchTerm('');
  };

  const handleClearInvoice = () => {
    setFormData(prev => ({ ...prev, invoiceId: '' }));
  };

  const getSelectedInvoice = () => {
    return invoices.find(inv => inv.id === formData.invoiceId);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = invoiceSearchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.counterparty.toLowerCase().includes(searchLower)
    );
  });

  const filteredAssets = assets.filter(asset => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      asset.name.toLowerCase().includes(searchLower) ||
      asset.category.toLowerCase().includes(searchLower) ||
      asset.purchasePrice.toString().includes(searchLower) ||
      (asset.description && asset.description.toLowerCase().includes(searchLower))
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'FULLY_DEPRECIATED': return 'bg-gray-100 text-gray-800';
      case 'DISPOSED': return 'bg-red-100 text-red-800';
      case 'SOLD': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
            <p className="mt-1 text-gray-600">Track and manage your business assets and depreciation</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>Add Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                <DialogDescription>
                  {editingAsset ? 'Update asset details' : 'Enter the details for your new asset'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label.Root>Asset Name *</Label.Root>
                    <input
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Laptop, Vehicle, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root>Category *</Label.Root>
                    <input
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Computer, Vehicle, Equipment"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label.Root>Description</Label.Root>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label.Root>Purchase Date *</Label.Root>
                    <input
                      name="purchaseDate"
                      type="date"
                      required
                      value={formData.purchaseDate}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root>Purchase Price (€) *</Label.Root>
                    <input
                      name="purchasePrice"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label.Root>Link to Purchase Invoice (Optional)</Label.Root>
                  {getSelectedInvoice() ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-gray-50">
                        <div className="text-sm">
                          <span className="font-medium">{getSelectedInvoice()?.invoiceNumber}</span>
                          <span className="text-gray-600"> - {getSelectedInvoice()?.counterparty}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(getSelectedInvoice()!.issueDate).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      <Button type="button" variant="outline" onClick={handleClearInvoice}>
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInvoiceSearchDialog(true)}
                      className="w-full"
                    >
                      Select Invoice
                    </Button>
                  )}
                  <p className="text-xs text-gray-500">
                    Link this asset to the purchase invoice used to acquire it
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label.Root>Depreciation Method *</Label.Root>
                    <select
                      name="depreciationMethod"
                      required
                      value={formData.depreciationMethod}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="STRAIGHT_LINE">Straight Line</option>
                      <option value="DECLINING_BALANCE">Declining Balance</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label.Root>Depreciation Rate (%) *</Label.Root>
                    <input
                      name="depreciationRate"
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.depreciationRate}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label.Root>Useful Life (years) *</Label.Root>
                    <input
                      name="usefulLife"
                      type="number"
                      required
                      min="1"
                      value={formData.usefulLife}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root>Residual Value (€)</Label.Root>
                    <input
                      name="residualValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.residualValue}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label.Root>Notes</Label.Root>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingAsset ? 'Update' : 'Create'} Asset</Button>
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
              placeholder="Search assets by name, category, price, or description..."
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

        {/* Assets Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => (
            <Card key={asset.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                    <CardDescription>{asset.category}</CardDescription>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="font-medium">{formatCurrency(asset.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Value:</span>
                    <span className="font-medium">{formatCurrency(asset.currentBookValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accumulated Depreciation:</span>
                    <span className="font-medium text-red-600">{formatCurrency(asset.accumulatedDepreciation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Depreciation Rate:</span>
                    <span className="font-medium">{asset.depreciationRate}% / year</span>
                  </div>
                  {asset.invoice && (
                    <div className="flex flex-col pt-2 mt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500 mb-1">Linked Invoice:</span>
                      <div className="flex justify-between">
                        <span className="text-xs font-medium text-blue-600">{asset.invoice.invoiceNumber}</span>
                        <span className="text-xs text-gray-600">{asset.invoice.counterparty}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewSchedule(asset)}>
                    Schedule
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(asset)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(asset.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoice Search Dialog */}
        <Dialog open={invoiceSearchDialog} onOpenChange={(open) => {
          setInvoiceSearchDialog(open);
          if (!open) setInvoiceSearchTerm('');
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Select Purchase Invoice</DialogTitle>
              <DialogDescription>Search and select the invoice used to purchase this asset</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="space-y-2">
                <Label.Root>Search</Label.Root>
                <input
                  type="text"
                  placeholder="Search by invoice number or supplier..."
                  value={invoiceSearchTerm}
                  onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredInvoices.length > 0 ? (
                  <div className="divide-y">
                    {filteredInvoices.map((invoice) => (
                      <button
                        key={invoice.id}
                        onClick={() => handleSelectInvoice(invoice)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                            <div className="text-sm text-gray-600">{invoice.counterparty}</div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(invoice.issueDate).toLocaleDateString('nl-NL')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    {invoices.length === 0 ? (
                      <div className="text-center">
                        <p>No purchase invoices found</p>
                        <p className="text-sm mt-1">Create a purchase invoice first</p>
                      </div>
                    ) : (
                      <p>No invoices match your search</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Depreciation Schedule Dialog */}
        <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Depreciation Schedule: {selectedAsset?.name}</DialogTitle>
              <DialogDescription>{selectedAsset?.category}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Year</th>
                    <th className="px-4 py-2 text-right">Starting Value</th>
                    <th className="px-4 py-2 text-right">Depreciation</th>
                    <th className="px-4 py-2 text-right">Accumulated</th>
                    <th className="px-4 py-2 text-right">Ending Value</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((entry) => (
                    <tr key={entry.year} className="border-t">
                      <td className="px-4 py-2">{entry.year}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(entry.startingBookValue)}</td>
                      <td className="px-4 py-2 text-right text-red-600">{formatCurrency(entry.depreciationExpense)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(entry.accumulatedDepreciation)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(entry.endingBookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {assets.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">No assets yet</p>
                <p className="mt-2 text-sm">Click "Add Asset" to start tracking your business assets</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
