import ModalWrapper from "./ModalWrapper";

interface DepreciationModalProps {
  showDepreciationModal: boolean;
  depreciationResults: any[];
  financialYear: string;
  onClose: () => void;
  formatCurrency: (value: number) => string;
}

export default function DepreciationModal({
  showDepreciationModal,
  depreciationResults,
  financialYear,
  onClose,
  formatCurrency
}: DepreciationModalProps) {
  return (
    <ModalWrapper isOpen={showDepreciationModal} onClose={onClose} maxWidth="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Depreciation Report - FY {financialYear}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Asset ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Asset Name</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Purchase Price</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Months Held</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Acc. Depreciation</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Acc. Book Value</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Tax Depreciation</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Tax Book Value</th>
              </tr>
            </thead>
            <tbody>
              {depreciationResults.map((result, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{result.assetId || "-"}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{result.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(result.purchasePrice)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{result.monthsHeld}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(result.accDepreciation)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(result.bookValueAcc)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(result.taxDepreciation)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(result.bookValueTax)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">-</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(depreciationResults.reduce((sum, r) => sum + r.accDepreciation, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(depreciationResults.reduce((sum, r) => sum + r.bookValueAcc, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(depreciationResults.reduce((sum, r) => sum + r.taxDepreciation, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(depreciationResults.reduce((sum, r) => sum + r.bookValueTax, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-3 justify-end mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
    </ModalWrapper>
  );
}