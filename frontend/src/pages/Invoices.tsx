import { useState, useEffect } from 'react';
import * as Label from '@radix-ui/react-label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/Dialog';
import { Button } from '../components/Button';
import { Separator } from '../components/Separator';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  reverseCharge?: boolean;
  reverseChargeLocation?: 'EU' | 'NON_EU';
  vatCategory?: string;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
}

interface Invoice {
  id: string;
  type: 'SALES' | 'PURCHASE';
  counterparty: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIALLY_PAID';
  attachmentPath?: string;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'PURCHASE' as 'SALES' | 'PURCHASE',
    counterparty: '',
    invoiceNumber: '',
    invoiceDate: '',
    paymentTermDays: 30,
    currency: 'EUR',
    paymentStatus: 'UNPAID' as 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIALLY_PAID',
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, vatRate: 0.21, reverseCharge: false },
  ]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('/api/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number | boolean) => {
    setLineItems(prev => {
      const updated = [...prev];
      if (field === 'description' || field === 'vatCategory' || field === 'reverseChargeLocation') {
        updated[index] = { ...updated[index], [field]: value };
      } else if (field === 'reverseCharge') {
        updated[index] = {
          ...updated[index],
          [field]: value,
          // Clear location if unchecking reverse charge
          ...(value === false && { reverseChargeLocation: undefined })
        };
      } else {
        updated[index] = { ...updated[index], [field]: parseFloat(value as string) || 0 };
      }
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, vatRate: 0.21, reverseCharge: false }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create preview URL for the file
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    setEditingInvoice(invoice);

    // Calculate payment term from dates
    const issueDate = new Date(invoice.issueDate);
    const dueDate = new Date(invoice.dueDate);
    const paymentTermDays = Math.round((dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));

    setFormData({
      type: invoice.type,
      counterparty: invoice.counterparty,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.split('T')[0],
      paymentTermDays: paymentTermDays,
      currency: invoice.currency,
      paymentStatus: invoice.paymentStatus,
    });

    setLineItems(invoice.lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      reverseCharge: item.reverseCharge || false,
      reverseChargeLocation: item.reverseChargeLocation,
    })));

    // Load the attachment for preview if it exists
    if (invoice.attachmentPath) {
      try {
        const response = await fetch(invoice.attachmentPath);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFilePreviewUrl(url);

        // Create a File object from the blob for consistency
        const filename = invoice.attachmentPath.split('/').pop() || 'attachment.pdf';
        const file = new File([blob], filename, { type: blob.type });
        setSelectedFile(file);
      } catch (error) {
        console.error('Error loading attachment:', error);
      }
    }

    setUploadDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Calculate due date from invoice date + payment term
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + formData.paymentTermDays);

      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('counterparty', formData.counterparty);
      formDataToSend.append('invoiceNumber', formData.invoiceNumber);
      formDataToSend.append('issueDate', formData.invoiceDate);
      formDataToSend.append('dueDate', dueDate.toISOString().split('T')[0]);
      formDataToSend.append('currency', formData.currency);
      formDataToSend.append('paymentStatus', formData.paymentStatus);
      formDataToSend.append('lineItems', JSON.stringify(lineItems));

      if (selectedFile) {
        formDataToSend.append('attachment', selectedFile);
      }

      if (editingInvoice) {
        // Update existing invoice
        await axios.put(`/api/invoices/${editingInvoice.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Create new invoice
        await axios.post('/api/invoices', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      await fetchInvoices();
      setUploadDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'PURCHASE',
      counterparty: '',
      invoiceNumber: '',
      invoiceDate: '',
      paymentTermDays: 30,
      currency: 'EUR',
      paymentStatus: 'UNPAID',
    });
    setLineItems([{ description: '', quantity: 1, unitPrice: 0, vatRate: 0.21, reverseCharge: false }]);
    setSelectedFile(null);
    setEditingInvoice(null);

    // Clean up preview URL
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setNumPages(null);
  };

  const calculateLineItemTotal = (item: InvoiceLineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const vatAmount = subtotal * item.vatRate;
    // For reverse charge, don't add VAT to the total
    return item.reverseCharge ? subtotal : subtotal + vatAmount;
  };

  const calculateLineItemVatAmount = (item: InvoiceLineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    return subtotal * item.vatRate;
  };

  const calculateInvoiceTotal = (invoice: Invoice) => {
    return invoice.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const filteredInvoices = filterType === 'ALL'
    ? invoices
    : invoices.filter(inv => inv.type === filterType);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-700 bg-green-50 border-green-200';
      case 'UNPAID': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'OVERDUE': return 'text-red-700 bg-red-50 border-red-200';
      case 'PARTIALLY_PAID': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-gray-600">Manage your sales and purchase invoices</p>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>Upload Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
              <div className="p-6 border-b">
                <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Upload New Invoice'}</DialogTitle>
                  <DialogDescription>
                    {editingInvoice ? 'Update the invoice details.' : 'Fill in the invoice details and upload the document.'}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                {/* File upload section - always visible */}
                <div className="space-y-2 p-4 border-b">
                  <Label.Root htmlFor="attachment">
                    Attachment (PDF, JPG, PNG - max 10MB) {editingInvoice && '- Optional'}
                  </Label.Root>
                  <input
                    id="attachment"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedFile && (
                    <p className="text-sm text-slate-600">Selected: {selectedFile.name}</p>
                  )}
                </div>

                {/* Main content area */}
                {filePreviewUrl && selectedFile ? (
                  /* Side-by-side layout when file is selected */
                  <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 p-6">
                    {/* Left: PDF/Image Preview */}
                    <div className="border border-slate-200 rounded-lg overflow-auto bg-gray-50 p-4 h-full">
                      <div className="flex flex-col items-start w-full">
                        {selectedFile.type === 'application/pdf' ? (
                          <Document
                            file={filePreviewUrl}
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            className="w-full"
                          >
                            <div className="space-y-4">
                              {Array.from(new Array(numPages || 1), (_, index) => (
                                <Page
                                  key={`page_${index + 1}`}
                                  pageNumber={index + 1}
                                  width={Math.min(window.innerWidth * 0.35, 500)}
                                  className="shadow-lg"
                                />
                              ))}
                            </div>
                          </Document>
                        ) : (
                          <img
                            src={filePreviewUrl}
                            alt="Invoice preview"
                            className="w-full h-auto object-contain"
                          />
                        )}
                      </div>
                    </div>

                    {/* Right: Form Fields (Scrollable) */}
                    <div className="overflow-y-auto h-full">
                      <div className="space-y-4 pr-2">
                      <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="type">Invoice Type</Label.Root>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SALES">Sales Invoice</option>
                      <option value="PURCHASE">Purchase Invoice</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="counterparty">
                      {formData.type === 'SALES' ? 'Customer' : 'Supplier'}
                    </Label.Root>
                    <input
                      id="counterparty"
                      name="counterparty"
                      type="text"
                      required
                      value={formData.counterparty}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="invoiceNumber">Invoice Number</Label.Root>
                    <input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      type="text"
                      required
                      value={formData.invoiceNumber}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="INV-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="invoiceDate">Invoice Date</Label.Root>
                    <input
                      id="invoiceDate"
                      name="invoiceDate"
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="paymentTermDays">Payment term (in days)</Label.Root>
                    <input
                      id="paymentTermDays"
                      name="paymentTermDays"
                      type="number"
                      required
                      min="0"
                      value={formData.paymentTermDays}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="currency">Currency</Label.Root>
                    <input
                      id="currency"
                      name="currency"
                      type="text"
                      required
                      value={formData.currency}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="paymentStatus">Payment Status</Label.Root>
                    <select
                      id="paymentStatus"
                      name="paymentStatus"
                      required
                      value={formData.paymentStatus}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UNPAID">Unpaid</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIALLY_PAID">Partially Paid</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label.Root className="text-lg font-semibold">Line Items</Label.Root>
                    <Button type="button" onClick={addLineItem} size="sm" variant="outline">
                      Add Line Item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {lineItems.map((item, index) => (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 bg-slate-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Item {index + 1}</span>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">Description</Label.Root>
                            <input
                              type="text"
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">Quantity</Label.Root>
                            <input
                              type="number"
                              placeholder="Quantity"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">Unit Price (€) - Excl. VAT</Label.Root>
                            <input
                              type="number"
                              placeholder="Unit Price (€) - Excl. VAT"
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">VAT Rate</Label.Root>
                            <select
                              value={item.vatRate}
                              onChange={(e) => handleLineItemChange(index, 'vatRate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              required
                            >
                              <option value="0">0% VAT</option>
                              <option value="0.09">9% VAT</option>
                              <option value="0.21">21% VAT</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`reverseCharge-${index}`}
                                checked={item.reverseCharge || false}
                                onChange={(e) => handleLineItemChange(index, 'reverseCharge', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                              />
                              <Label.Root htmlFor={`reverseCharge-${index}`} className="text-xs text-slate-600">
                                BTW Verlegd (Reverse Charge)
                              </Label.Root>
                            </div>
                            {item.reverseCharge && (
                              <select
                                value={item.reverseChargeLocation || ''}
                                onChange={(e) => handleLineItemChange(index, 'reverseChargeLocation', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mt-2"
                                required
                              >
                                <option value="">Selecteer locatie...</option>
                                <option value="EU">Binnen EU</option>
                                <option value="NON_EU">Buiten EU</option>
                              </select>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs text-slate-600">VAT Amount: €{calculateLineItemVatAmount(item).toFixed(2)}</span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-slate-700">
                                Total: €{calculateLineItemTotal(item).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                      </div>
                      </div>
                    </div>
                ) : editingInvoice ? (
                  /* Single column layout when editing without new file */
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="type">Invoice Type</Label.Root>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SALES">Sales Invoice</option>
                      <option value="PURCHASE">Purchase Invoice</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="counterparty">
                      {formData.type === 'SALES' ? 'Customer' : 'Supplier'}
                    </Label.Root>
                    <input
                      id="counterparty"
                      name="counterparty"
                      type="text"
                      required
                      value={formData.counterparty}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="invoiceNumber">Invoice Number</Label.Root>
                    <input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      type="text"
                      required
                      value={formData.invoiceNumber}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="INV-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="invoiceDate">Invoice Date</Label.Root>
                    <input
                      id="invoiceDate"
                      name="invoiceDate"
                      type="date"
                      required
                      value={formData.invoiceDate}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="paymentTermDays">Payment term (in days)</Label.Root>
                    <input
                      id="paymentTermDays"
                      name="paymentTermDays"
                      type="number"
                      required
                      min="0"
                      value={formData.paymentTermDays}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label.Root htmlFor="currency">Currency</Label.Root>
                    <input
                      id="currency"
                      name="currency"
                      type="text"
                      required
                      value={formData.currency}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="paymentStatus">Payment Status</Label.Root>
                    <select
                      id="paymentStatus"
                      name="paymentStatus"
                      required
                      value={formData.paymentStatus}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UNPAID">Unpaid</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIALLY_PAID">Partially Paid</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label.Root className="text-lg font-semibold">Line Items</Label.Root>
                    <Button type="button" onClick={addLineItem} size="sm" variant="outline">
                      Add Line Item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {lineItems.map((item, index) => (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 bg-slate-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Item {index + 1}</span>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">Description</Label.Root>
                            <input
                              type="text"
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">Quantity</Label.Root>
                            <input
                              type="number"
                              placeholder="Quantity"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">Unit Price (€) - Excl. VAT</Label.Root>
                            <input
                              type="number"
                              placeholder="Unit Price (€) - Excl. VAT"
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label.Root className="text-xs text-slate-600">VAT Rate</Label.Root>
                            <select
                              value={item.vatRate}
                              onChange={(e) => handleLineItemChange(index, 'vatRate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              required
                            >
                              <option value="0">0% VAT</option>
                              <option value="0.09">9% VAT</option>
                              <option value="0.21">21% VAT</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`reverseCharge-${index}`}
                                checked={item.reverseCharge || false}
                                onChange={(e) => handleLineItemChange(index, 'reverseCharge', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                              />
                              <Label.Root htmlFor={`reverseCharge-${index}`} className="text-xs text-slate-600">
                                BTW Verlegd (Reverse Charge)
                              </Label.Root>
                            </div>
                            {item.reverseCharge && (
                              <select
                                value={item.reverseChargeLocation || ''}
                                onChange={(e) => handleLineItemChange(index, 'reverseChargeLocation', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mt-2"
                                required
                              >
                                <option value="">Selecteer locatie...</option>
                                <option value="EU">Binnen EU</option>
                                <option value="NON_EU">Buiten EU</option>
                              </select>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs text-slate-600">VAT Amount: €{calculateLineItemVatAmount(item).toFixed(2)}</span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-slate-700">
                                Total: €{calculateLineItemTotal(item).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                    </div>
                  </div>
                ) : (
                  /* Single column layout when no file is selected */
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <p className="text-sm text-slate-600 text-center py-8 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                      Upload a file to see the preview and fill in the invoice details
                    </p>
                  </div>
                )}

                {/* Footer - always visible */}
                <div className="border-t p-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setUploadDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingInvoice ? 'Saving...' : 'Uploading...') : (editingInvoice ? 'Save Changes' : 'Upload Invoice')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 flex gap-2">
          <Button
            variant={filterType === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilterType('ALL')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterType === 'SALES' ? 'default' : 'outline'}
            onClick={() => setFilterType('SALES')}
            size="sm"
          >
            Sales
          </Button>
          <Button
            variant={filterType === 'PURCHASE' ? 'default' : 'outline'}
            onClick={() => setFilterType('PURCHASE')}
            size="sm"
          >
            Purchases
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-600">Loading invoices...</p>
            </CardContent>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-600">
                No invoices found. Upload your first invoice to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEditInvoice(invoice)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {invoice.invoiceNumber}
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          invoice.type === 'SALES' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {invoice.type}
                        </span>
                      </CardTitle>
                      <CardDescription>{invoice.counterparty}</CardDescription>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                      {invoice.paymentStatus.replace('_', ' ')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Invoice Date</p>
                      <p className="font-medium">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Due Date</p>
                      <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-medium text-lg">
                        {invoice.currency} {calculateInvoiceTotal(invoice).toFixed(2)}
                      </p>
                    </div>
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
