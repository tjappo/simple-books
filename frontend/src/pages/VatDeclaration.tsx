import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import * as Label from '@radix-ui/react-label';
import axios from 'axios';
import { DateTime } from 'luxon';

interface VatBox {
  base?: number;
  vat?: number;
}

interface VatDeclarationData {
  id?: string;
  period: string;
  periodType: string;
  startDate: string;
  endDate: string;
  box1a_base: number;
  box1a_vat: number;
  box1b_base: number;
  box1b_vat: number;
  box1c_base?: number;
  box1c_vat?: number;
  box1d_vat?: number;
  box1e_base: number;
  box2a_base: number;
  box2a_vat: number;
  box2b_base?: number;
  box3a_base: number;
  box3b_base: number;
  box3c_base?: number;
  box4a_base: number;
  box4a_vat: number;
  box4b_base: number;
  box4b_vat: number;
  box4c_base?: number;
  box4c_vat?: number;
  box5a: number;
  box5b: number;
  box5d: number;
  status: string;
}

export function VatDeclaration() {
  const getCurrentPeriod = (type: 'MONTHLY' | 'QUARTERLY'): number => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    return type === 'MONTHLY' ? currentMonth : Math.ceil(currentMonth / 3);
  };

  const [periodType, setPeriodType] = useState<'MONTHLY' | 'QUARTERLY'>('QUARTERLY');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(getCurrentPeriod('QUARTERLY'));
  const [declaration, setDeclaration] = useState<VatDeclarationData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [boxInvoices, setBoxInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const calculatePeriod = () => {
    const startDate = new Date();
    const endDate = new Date();

    if (periodType === 'MONTHLY') {
      startDate.setFullYear(selectedYear, selectedPeriod - 1, 1);
      endDate.setFullYear(selectedYear, selectedPeriod, 0);
    } else {
      const quarterStartMonth = (selectedPeriod - 1) * 3;
      startDate.setFullYear(selectedYear, quarterStartMonth, 1);
      endDate.setFullYear(selectedYear, quarterStartMonth + 3, 0);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period: periodType === 'MONTHLY'
        ? `${selectedYear}-${selectedPeriod.toString().padStart(2, '0')}`
        : `${selectedYear}-Q${selectedPeriod}`,
    };
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const { startDate, endDate, period } = calculatePeriod();

      const response = await axios.post('/api/api/vat-declaration/calculate', {
        startDate,
        endDate,
        periodType,
        period,
      });

      setDeclaration(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to calculate VAT declaration';
      setError(errorMessage);

      // If the declaration is already final, try to fetch and display it instead
      if (errorMessage.includes('final')) {
        try {
          const { period } = calculatePeriod();
          const existingResponse = await axios.get(`/api/api/vat-declaration/period/${period}`);
          setDeclaration(existingResponse.data);
        } catch (fetchErr) {
          // If fetch also fails, keep the original error
        }
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const handleMakeFinal = () => {
    if (!declaration) return;
    setShowConfirmModal(true);
  };

  const handleConfirmFinalize = async () => {
    if (!declaration) return;

    setShowConfirmModal(false);

    try {
      const response = await axios.post('/api/api/vat-declaration/finalize', declaration);
      setDeclaration(response.data);
      setError(null); // Clear any existing errors on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize declaration');
    }
  };

  const handleCancelFinalize = () => {
    setShowConfirmModal(false);
  };

  const handleExportPdf = async () => {
    if (!declaration || !declaration.id) return;

    try {
      const response = await axios.get(`/api/api/vat-declaration/${declaration.id}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BTW-Aangifte-${declaration.period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export PDF');
    }
  };

  const handleBoxClick = async (boxId: string) => {
    if (!declaration) return;

    setSelectedBox(boxId);
    setIsLoadingInvoices(true);

    try {
      let response;
      if (declaration.id) {
        // For finalized declarations, use the ID-based endpoint
        response = await axios.get(`/api/api/vat-declaration/${declaration.id}/invoices/${boxId}`);
      } else {
        // For draft declarations, use the period-based endpoint
        response = await axios.post(`/api/api/vat-declaration/invoices/${boxId}`, {
          startDate: declaration.startDate,
          endDate: declaration.endDate,
        });
      }
      setBoxInvoices(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedBox(null);
    setBoxInvoices([]);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmModal) {
          handleCancelFinalize();
        } else if (selectedBox) {
          handleCloseModal();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedBox, showConfirmModal]);

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return '€ 0';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const VatBoxDisplay = ({ id, label, base, vat, bgColor = 'bg-white' }: {
    id: string;
    label: string;
    base?: number;
    vat?: number;
    bgColor?: string;
  }) => (
    <div
      className={`p-4 rounded-lg border ${bgColor} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => handleBoxClick(id)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{id}</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{label}</p>
        </div>
        <div className="text-right">
          {base !== undefined && (
            <p className="text-xs text-gray-600">Grondslag: {formatCurrency(base)}</p>
          )}
          {vat !== undefined && (
            <p className="text-lg font-bold text-gray-900">{formatCurrency(vat)}</p>
          )}
          <p className="text-xs text-blue-600 mt-1">Toon facturen →</p>
        </div>
      </div>
    </div>
  );

  const TotalBox = ({ id, label, amount, highlight = false }: {
    id: string;
    label: string;
    amount: number;
    highlight?: boolean;
  }) => (
    <div className={`p-6 rounded-lg border-2 ${highlight ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{id}</p>
          <p className="text-base font-medium text-gray-900 mt-1">{label}</p>
        </div>
        <p className={`text-3xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
          {formatCurrency(amount)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">BTW-aangifte</h1>
          <p className="mt-2 text-lg text-gray-600">
            Bereken uw BTW-aangifte per periode
          </p>
        </div>

        {/* Period Selector Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Periode selecteren</CardTitle>
            <CardDescription>Kies de periode waarvoor u de BTW-aangifte wilt berekenen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Period Type */}
              <div className="space-y-2">
                <Label.Root className="text-sm font-medium">Type periode</Label.Root>
                <select
                  value={periodType}
                  onChange={(e) => {
                    const newType = e.target.value as 'MONTHLY' | 'QUARTERLY';
                    setPeriodType(newType);
                    setSelectedPeriod(getCurrentPeriod(newType));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MONTHLY">Maandelijks</option>
                  <option value="QUARTERLY">Kwartaal</option>
                </select>
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label.Root className="text-sm font-medium">Jaar</Label.Root>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Period */}
              <div className="space-y-2">
                <Label.Root className="text-sm font-medium">
                  {periodType === 'MONTHLY' ? 'Maand' : 'Kwartaal'}
                </Label.Root>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {periodType === 'MONTHLY' ? (
                    <>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {DateTime.fromObject({ month }).toFormat('MMMM')}
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value={1}>Q1 (jan-mrt)</option>
                      <option value={2}>Q2 (apr-jun)</option>
                      <option value={3}>Q3 (jul-sep)</option>
                      <option value={4}>Q4 (okt-dec)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Calculate Button */}
              <div className="flex items-end">
                <Button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="w-full"
                >
                  {isCalculating ? 'Berekenen...' : 'Berekenen'}
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {declaration && (
          <>
            {/* Status Banner */}
            <div className="mb-6 flex items-center justify-between p-6 rounded-lg border-2"
                 style={{
                   backgroundColor: declaration.status === 'DRAFT' ? '#fef3c7' : declaration.status === 'FINAL' ? '#d1fae5' : '#dbeafe',
                   borderColor: declaration.status === 'DRAFT' ? '#f59e0b' : declaration.status === 'FINAL' ? '#10b981' : '#3b82f6'
                 }}>
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Status</p>
                <p className="text-3xl font-bold mt-1"
                   style={{
                     color: declaration.status === 'DRAFT' ? '#b45309' : declaration.status === 'FINAL' ? '#047857' : '#1e40af'
                   }}>
                  {declaration.status === 'DRAFT' ? 'Concept' : declaration.status === 'FINAL' ? 'Definitief' : 'Ingediend'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Periode</p>
                <p className="text-xl font-semibold text-gray-900">{declaration.period}</p>
              </div>
            </div>

            {/* Rubriek 1 - Binnenland */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Rubriek 1: Prestaties binnenland</CardTitle>
                <CardDescription>Leveringen en diensten in Nederland</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <VatBoxDisplay
                    id="1a"
                    label="Leveringen/diensten belast met hoog tarief (21%)"
                    base={declaration.box1a_base}
                    vat={declaration.box1a_vat}
                  />
                  <VatBoxDisplay
                    id="1b"
                    label="Leveringen/diensten belast met laag tarief (9%)"
                    base={declaration.box1b_base}
                    vat={declaration.box1b_vat}
                  />
                  {(declaration.box1c_base || declaration.box1c_vat) && (
                    <VatBoxDisplay
                      id="1c"
                      label="Prestaties overige tarieven"
                      base={declaration.box1c_base || 0}
                      vat={declaration.box1c_vat || 0}
                      bgColor="bg-yellow-50"
                    />
                  )}
                  {declaration.box1d_vat && (
                    <VatBoxDisplay
                      id="1d"
                      label="Privégebruik"
                      vat={declaration.box1d_vat}
                      bgColor="bg-yellow-50"
                    />
                  )}
                  <VatBoxDisplay
                    id="1e"
                    label="Leveringen/diensten belast met 0% / verlegd"
                    base={declaration.box1e_base}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rubriek 2 - Verlegging binnenland */}
            {(declaration.box2a_vat > 0 || declaration.box2b_base) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Rubriek 2: Verleggingsregelingen binnenland</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {declaration.box2a_vat > 0 && (
                      <VatBoxDisplay
                        id="2a"
                        label="Leveringen/diensten waarbij de BTW naar u is verlegd"
                        base={declaration.box2a_base}
                        vat={declaration.box2a_vat}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rubriek 3 - Buitenland */}
            {(declaration.box3a_base > 0 || declaration.box3b_base > 0 || declaration.box3c_base) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Rubriek 3: Prestaties naar of in het buitenland</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {declaration.box3a_base > 0 && (
                      <VatBoxDisplay
                        id="3a"
                        label="Leveringen buiten de EU (uitvoer)"
                        base={declaration.box3a_base}
                      />
                    )}
                    {declaration.box3b_base > 0 && (
                      <VatBoxDisplay
                        id="3b"
                        label="Leveringen/diensten naar of in EU-landen"
                        base={declaration.box3b_base}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rubriek 4 - Buitenland naar NL */}
            {(declaration.box4a_vat > 0 || declaration.box4b_vat > 0) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Rubriek 4: Prestaties vanuit het buitenland aan u verricht</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {declaration.box4a_vat > 0 && (
                      <VatBoxDisplay
                        id="4a"
                        label="Leveringen/diensten van buiten de EU"
                        base={declaration.box4a_base}
                        vat={declaration.box4a_vat}
                      />
                    )}
                    {declaration.box4b_vat > 0 && (
                      <VatBoxDisplay
                        id="4b"
                        label="Verwervingen uit EU-landen"
                        base={declaration.box4b_base}
                        vat={declaration.box4b_vat}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rubriek 5 - Totalen */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Rubriek 5: Berekening totalen</CardTitle>
                <CardDescription>Eindresultaat van de BTW-aangifte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <TotalBox
                    id="5a"
                    label="Verschuldigde omzetbelasting (BTW)"
                    amount={declaration.box5a}
                  />
                  <TotalBox
                    id="5b"
                    label="Voorbelasting"
                    amount={declaration.box5b}
                  />
                  <TotalBox
                    id="5d"
                    label={declaration.box5d >= 0 ? 'Te betalen' : 'Terug te vragen'}
                    amount={Math.abs(declaration.box5d)}
                    highlight
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={!declaration.id}
                  >
                    PDF exporteren
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMakeFinal}
                    disabled={declaration.status !== 'DRAFT'}
                  >
                    Definitief maken
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Invoice Modal */}
        {selectedBox && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Facturen voor vak {selectedBox}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Periode: {declaration?.period}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {isLoadingInvoices ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Laden...</p>
                  </div>
                ) : boxInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Geen facturen gevonden voor dit vak</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {boxInvoices.map((invoice) => (
                      <div key={invoice.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-600">
                              {invoice.counterparty}
                            </p>
                            <p className="text-xs text-gray-500">
                              {DateTime.fromISO(invoice.issueDate).toFormat('dd MMM yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              invoice.type === 'SALES' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {invoice.type === 'SALES' ? 'Verkoop' : 'Inkoop'}
                            </span>
                          </div>
                        </div>

                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-2">Omschrijving</th>
                              <th className="py-2 text-right">Aantal</th>
                              <th className="py-2 text-right">Prijs</th>
                              <th className="py-2 text-right">Subtotaal</th>
                              <th className="py-2 text-right">BTW</th>
                              <th className="py-2 text-right">Totaal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoice.lineItems.map((item: any) => (
                              <tr key={item.id} className="border-b">
                                <td className="py-2">{item.description}</td>
                                <td className="py-2 text-right">{item.quantity}</td>
                                <td className="py-2 text-right">
                                  {new Intl.NumberFormat('nl-NL', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  }).format(item.unitPrice)}
                                </td>
                                <td className="py-2 text-right">
                                  {new Intl.NumberFormat('nl-NL', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  }).format(item.subtotal)}
                                </td>
                                <td className="py-2 text-right">
                                  {new Intl.NumberFormat('nl-NL', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  }).format(item.vatAmount)}
                                </td>
                                <td className="py-2 text-right font-semibold">
                                  {new Intl.NumberFormat('nl-NL', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  }).format(item.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold">
                              <td colSpan={3} className="py-2 text-right">Totaal:</td>
                              <td className="py-2 text-right">
                                {new Intl.NumberFormat('nl-NL', {
                                  style: 'currency',
                                  currency: 'EUR',
                                }).format(
                                  invoice.lineItems.reduce((sum: number, item: any) => sum + item.subtotal, 0)
                                )}
                              </td>
                              <td className="py-2 text-right">
                                {new Intl.NumberFormat('nl-NL', {
                                  style: 'currency',
                                  currency: 'EUR',
                                }).format(
                                  invoice.lineItems.reduce((sum: number, item: any) => sum + item.vatAmount, 0)
                                )}
                              </td>
                              <td className="py-2 text-right">
                                {new Intl.NumberFormat('nl-NL', {
                                  style: 'currency',
                                  currency: 'EUR',
                                }).format(
                                  invoice.lineItems.reduce((sum: number, item: any) => sum + item.total, 0)
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-900">
                          Totaal aantal facturen:
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {boxInvoices.length}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="font-semibold text-gray-900">
                          Totaal BTW voor dit vak:
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {new Intl.NumberFormat('nl-NL', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(
                            boxInvoices.reduce((sum, inv) =>
                              sum + inv.lineItems.reduce((s: number, item: any) => s + item.vatAmount, 0), 0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && declaration && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCancelFinalize}
          >
            <div
              className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-amber-100 rounded-full mb-4">
                  <svg
                    className="w-6 h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  Aangifte definitief maken
                </h3>

                <div className="space-y-3 mb-6">
                  <p className="text-gray-700 text-center">
                    Weet u zeker dat u deze aangifte definitief wilt maken?
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Let op:</strong> Een definitieve aangifte kan niet meer worden gewijzigd of herberekend.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-600">
                      <strong>Periode:</strong> {declaration.period}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelFinalize}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={handleConfirmFinalize}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Definitief maken
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
