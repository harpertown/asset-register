import React from "react";

interface DepreciationResult {
  assetId: string;
  name: string;
  purchasePrice: number;
  months: any[];
  open: number;
  totalRevals: number;
  totalAdditions: number;
  totalDisposals: number;
  totalDepn: number;
  close: number;
  calcType?: string;
}

interface FYWorkingViewProps {
  depreciationResults: DepreciationResult[];
  formatCurrency: (amount: number, isTotal?: boolean) => string;
}

export const FYWorkingView: React.FC<FYWorkingViewProps> = ({ depreciationResults, formatCurrency }) => {
  // Helper to show "-" for zero values
  const displayValue = (amount: number) => {
    if (amount === 0) {
      return <span className="text-gray-400">-</span>;
    }
    return formatCurrency(amount);
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">FY Working View</h3>
      <p className="text-gray-600">Month-by-month depreciation schedule will appear here.</p>
      {depreciationResults.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Asset</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Open</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Additions</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Disposals</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Depreciation</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-b">Close</th>
              </tr>
            </thead>
            <tbody>
              {depreciationResults.map((result) => (
                <tr key={result.assetId} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900">{result.name}</td>
                  <td className="px-3 py-2 text-center text-gray-900">{displayValue(result.open)}</td>
                  <td className="px-3 py-2 text-center text-gray-900">{displayValue(result.totalAdditions)}</td>
                  <td className="px-3 py-2 text-center text-gray-900">{displayValue(result.totalDisposals)}</td>
                  <td className="px-3 py-2 text-center text-gray-900">{displayValue(result.totalDepn)}</td>
                  <td className="px-3 py-2 text-center text-gray-900">{displayValue(result.close)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FYWorkingView;
