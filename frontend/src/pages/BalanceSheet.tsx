import { useState } from 'react';
import axios from 'axios';
import * as Label from '@radix-ui/react-label';

interface AssetItem {
  id: string;
  name: string;
  purchasePrice: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

interface LiabilityItem {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  dueDate: string;
}

interface BalanceSheetData {
  asOfDate: string;
  assets: {
    fixedAssets: {
      items: AssetItem[];
      totalBookValue: number;
      totalAccumulatedDepreciation: number;
    };
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: {
      items: LiabilityItem[];
      total: number;
    };
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

const BalanceSheet = () => {
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const response = await axios.post('/api/balance-sheet/calculate', {
        asOfDate: asOfDate,
      });
      setBalanceSheet(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate balance sheet');
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Balance Sheet</h1>
        <p className="text-slate-600">View your financial position including assets and liabilities</p>
      </div>

      {/* Date Selection and Calculate Button */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <Label.Root className="block text-sm font-medium text-slate-700 mb-2">
              As of Date
            </Label.Root>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Balance Sheet Display */}
      {balanceSheet && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Balance Sheet</h2>
              <p className="text-slate-600">As of {formatDate(balanceSheet.asOfDate)}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Assets Section */}
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-4 pb-2 border-b-2 border-blue-600">
                  Assets
                </h3>

                {/* Fixed Assets */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-slate-700 mb-3">Fixed Assets</h4>

                  {balanceSheet.assets.fixedAssets.items.length > 0 ? (
                    <div className="space-y-2">
                      {balanceSheet.assets.fixedAssets.items.map((asset) => (
                        <div key={asset.id} className="flex justify-between items-start text-sm">
                          <div className="flex-1">
                            <div className="text-slate-700">{asset.name}</div>
                            <div className="text-xs text-slate-500">
                              Cost: {formatCurrency(asset.purchasePrice)} |
                              Depreciation: {formatCurrency(asset.accumulatedDepreciation)}
                            </div>
                          </div>
                          <div className="font-medium text-slate-800 ml-4">
                            {formatCurrency(asset.bookValue)}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
                        <span>Total Fixed Assets</span>
                        <span>{formatCurrency(balanceSheet.assets.fixedAssets.totalBookValue)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No fixed assets</p>
                  )}
                </div>

                {/* Total Assets */}
                <div className="pt-4 border-t-2 border-slate-800">
                  <div className="flex justify-between text-lg font-bold text-slate-800">
                    <span>Total Assets</span>
                    <span>{formatCurrency(balanceSheet.assets.totalAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Section */}
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-4 pb-2 border-b-2 border-green-600">
                  Liabilities & Equity
                </h3>

                {/* Liabilities */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-slate-700 mb-3">Liabilities</h4>

                  {/* Accounts Payable */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-slate-600 mb-2">Accounts Payable</h5>
                    {balanceSheet.liabilities.accountsPayable.items.length > 0 ? (
                      <div className="space-y-2">
                        {balanceSheet.liabilities.accountsPayable.items.map((liability) => (
                          <div key={liability.id} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <div className="text-slate-700">{liability.supplierName}</div>
                              <div className="text-xs text-slate-500">
                                Invoice: {liability.invoiceNumber}
                                {liability.dueDate && ` | Due: ${formatDate(liability.dueDate)}`}
                              </div>
                            </div>
                            <div className="font-medium text-slate-800 ml-4">
                              {formatCurrency(liability.totalAmount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No accounts payable</p>
                    )}
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
                    <span>Total Liabilities</span>
                    <span>{formatCurrency(balanceSheet.liabilities.totalLiabilities)}</span>
                  </div>
                </div>

                {/* Equity */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-slate-700 mb-3">Equity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">Retained Earnings</span>
                      <span className={`font-medium ${
                        balanceSheet.equity.retainedEarnings >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(balanceSheet.equity.retainedEarnings)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
                      <span>Total Equity</span>
                      <span className={
                        balanceSheet.equity.totalEquity >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }>
                        {formatCurrency(balanceSheet.equity.totalEquity)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Liabilities & Equity */}
                <div className="pt-4 border-t-2 border-slate-800">
                  <div className="flex justify-between text-lg font-bold text-slate-800">
                    <span>Total Liabilities & Equity</span>
                    <span>{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Check Warning */}
            {Math.abs(balanceSheet.assets.totalAssets - balanceSheet.totalLiabilitiesAndEquity) > 0.01 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> Assets do not equal Liabilities + Equity.
                  Difference: {formatCurrency(
                    Math.abs(balanceSheet.assets.totalAssets - balanceSheet.totalLiabilitiesAndEquity)
                  )}
                </p>
              </div>
            )}

            {/* Success Message */}
            {Math.abs(balanceSheet.assets.totalAssets - balanceSheet.totalLiabilitiesAndEquity) <= 0.01 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm text-center">
                  Balance sheet is balanced
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSheet;
