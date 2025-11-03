import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import * as Label from '@radix-ui/react-label';
import axios from 'axios';

interface ProfitLossStatement {
  period: string;
  periodType: 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export function ProfitLoss() {
  const getCurrentPeriod = (type: 'YEARLY' | 'MONTHLY' | 'QUARTERLY'): number => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    if (type === 'YEARLY') return 1; // Not used for yearly
    return type === 'MONTHLY' ? currentMonth : Math.ceil(currentMonth / 3);
  };

  const [periodType, setPeriodType] = useState<'YEARLY' | 'QUARTERLY' | 'MONTHLY'>('YEARLY');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(getCurrentPeriod('YEARLY'));
  const [statement, setStatement] = useState<ProfitLossStatement | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePeriod = () => {
    const startDate = new Date();
    const endDate = new Date();

    if (periodType === 'YEARLY') {
      startDate.setFullYear(selectedYear, 0, 1);
      endDate.setFullYear(selectedYear, 11, 31);
    } else if (periodType === 'MONTHLY') {
      startDate.setFullYear(selectedYear, selectedPeriod - 1, 1);
      endDate.setFullYear(selectedYear, selectedPeriod, 0);
    } else {
      const quarterStartMonth = (selectedPeriod - 1) * 3;
      startDate.setFullYear(selectedYear, quarterStartMonth, 1);
      endDate.setFullYear(selectedYear, quarterStartMonth + 3, 0);
    }

    let period: string;
    if (periodType === 'YEARLY') {
      period = `${selectedYear}`;
    } else if (periodType === 'MONTHLY') {
      period = `${selectedYear}-${selectedPeriod.toString().padStart(2, '0')}`;
    } else {
      period = `${selectedYear}-Q${selectedPeriod}`;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period,
    };
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const { startDate, endDate, period } = calculatePeriod();

      const response = await axios.post('/api/profit-loss/calculate', {
        startDate,
        endDate,
        periodType,
        period,
      });

      setStatement(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate profit & loss');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!statement) return;

    try {
      const response = await axios.post('/api/profit-loss/pdf', statement, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Winst-en-Verliesrekening-${statement.period}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const availableYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Winst- en Verliesrekening</h1>
          <p className="mt-1 text-gray-600">Calculate profit & loss for your business</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Period Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Select Period</CardTitle>
                <CardDescription>Choose the period for your profit & loss statement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label.Root>Period Type</Label.Root>
                  <select
                    value={periodType}
                    onChange={(e) => {
                      const newType = e.target.value as 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
                      setPeriodType(newType);
                      setSelectedPeriod(getCurrentPeriod(newType));
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="YEARLY">Yearly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label.Root>Year</Label.Root>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {periodType === 'QUARTERLY' && (
                  <div className="space-y-2">
                    <Label.Root>Quarter</Label.Root>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">Q1 (Jan - Mar)</option>
                      <option value="2">Q2 (Apr - Jun)</option>
                      <option value="3">Q3 (Jul - Sep)</option>
                      <option value="4">Q4 (Oct - Dec)</option>
                    </select>
                  </div>
                )}

                {periodType === 'MONTHLY' && (
                  <div className="space-y-2">
                    <Label.Root>Month</Label.Root>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = new Date(2000, i, 1);
                        return (
                          <option key={i + 1} value={i + 1}>
                            {date.toLocaleString('en', { month: 'long' })}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <Button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="w-full"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate'}
                </Button>

                {error && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {statement ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profit & Loss Statement</CardTitle>
                      <CardDescription>Period: {statement.period}</CardDescription>
                    </div>
                    <Button onClick={handleExportPdf} variant="outline">
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Revenue */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">Omzet (Revenue)</h3>
                      <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                        <span className="text-gray-700">Total Revenue</span>
                        <span className="text-xl font-bold text-green-700">
                          {formatCurrency(statement.revenue)}
                        </span>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">Kosten (Expenses)</h3>
                      <div className="flex items-center justify-between rounded-lg bg-red-50 p-4">
                        <span className="text-gray-700">Total Expenses</span>
                        <span className="text-xl font-bold text-red-700">
                          {formatCurrency(statement.expenses)}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-gray-300" />

                    {/* Profit/Loss */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {statement.profit >= 0 ? 'Winst (Profit)' : 'Verlies (Loss)'}
                      </h3>
                      <div
                        className={`flex items-center justify-between rounded-lg p-6 ${
                          statement.profit >= 0
                            ? 'bg-gradient-to-r from-green-50 to-green-100'
                            : 'bg-gradient-to-r from-red-50 to-red-100'
                        }`}
                      >
                        <span className="text-lg font-semibold text-gray-700">
                          Net {statement.profit >= 0 ? 'Profit' : 'Loss'}
                        </span>
                        <span
                          className={`text-3xl font-bold ${
                            statement.profit >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {formatCurrency(Math.abs(statement.profit))}
                        </span>
                      </div>
                    </div>

                    {/* Period Details */}
                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Start Date:</span>{' '}
                          {new Date(statement.startDate).toLocaleDateString('nl-NL')}
                        </div>
                        <div>
                          <span className="font-medium">End Date:</span>{' '}
                          {new Date(statement.endDate).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No statement calculated yet</p>
                    <p className="mt-2 text-sm">
                      Select a period and click "Calculate" to generate your profit & loss statement
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
