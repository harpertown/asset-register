import { useState, useEffect } from "react";
import { formatPriceInput, parsePriceInput } from "~/utils";

interface ImportAssetFormProps {
  asset: any;
  onSave: (asset: any) => void;
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
}

export default function ImportAssetForm({
  asset,
  onSave,
  onNext,
  onSkip,
  isLast
}: ImportAssetFormProps) {
  const [editedAsset, setEditedAsset] = useState(asset);

  // Update editedAsset when asset prop changes
  useEffect(() => {
    setEditedAsset(asset);
  }, [asset]);

  const handleChange = (field: string, value: any) => {
    setEditedAsset({ ...editedAsset, [field]: value });
  };

  const handleSave = () => {
    onSave(editedAsset);
    onNext();
  };

  // Helper function to check if a field is incomplete
  const isFieldIncomplete = (fieldValue: any) => {
    return fieldValue === null || fieldValue === undefined || fieldValue === "" || fieldValue === 0;
  };

  // Helper function to get input class based on completeness
  const getInputClass = (fieldValue: any, isRequired: boolean = false) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-black";
    if (editedAsset.incomplete && isRequired && isFieldIncomplete(fieldValue)) {
      return `${baseClass} border-red-500 bg-red-50 focus:ring-red-500`;
    }
    return `${baseClass} border-gray-300 focus:ring-blue-500`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Review and edit the imported asset details:</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset ID
          </label>
          <input
            type="text"
            value={editedAsset.assetId || ""}
            onChange={(e) => handleChange("assetId", e.target.value)}
            className={getInputClass(editedAsset.assetId)}
            placeholder="e.g., 00001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Type
          </label>
          <input
            type="text"
            value={editedAsset.itemType || ""}
            onChange={(e) => handleChange("itemType", e.target.value)}
            className={getInputClass(editedAsset.itemType)}
            placeholder="e.g., Computers - laptop"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Name *
          </label>
          <input
            type="text"
            value={editedAsset.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={getInputClass(editedAsset.name, true)}
            placeholder="e.g., MacBook Pro 16-inch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serial Number
          </label>
          <input
            type="text"
            value={editedAsset.serialNumber || ""}
            onChange={(e) => handleChange("serialNumber", e.target.value)}
            className={getInputClass(editedAsset.serialNumber)}
            placeholder="e.g., ABC123456"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Price (NZD) *
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={formatPriceInput(editedAsset.purchasePrice?.toString() || "")}
            onChange={(e) => {
              const raw = parsePriceInput(e.target.value);
              if (/^\d*\.?\d*$/.test(raw)) {
                handleChange("purchasePrice", parseFloat(raw) || 0);
              }
            }}
            className={getInputClass(editedAsset.purchasePrice, true)}
            placeholder="0.00"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date *
          </label>
          <input
            type="date"
            value={editedAsset.purchaseDate || ""}
            onChange={(e) => handleChange("purchaseDate", e.target.value)}
            className={getInputClass(editedAsset.purchaseDate, true)}
          />
        </div>

        {/* Accounting Depreciation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depn Method (Acc)
          </label>
          <input
            type="text"
            value={editedAsset.depnMethodAcc || ""}
            onChange={(e) => handleChange("depnMethodAcc", e.target.value)}
            className={getInputClass(editedAsset.depnMethodAcc)}
            placeholder="e.g., Straight-line"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depn Rate (Acc)
          </label>
          <input
            type="text"
            value={editedAsset.depnRateAcc || ""}
            onChange={(e) => handleChange("depnRateAcc", e.target.value)}
            className={getInputClass(editedAsset.depnRateAcc)}
            placeholder="e.g., 2%"
          />
        </div>

        {/* Tax Depreciation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depn Method (Tax)
          </label>
          <input
            type="text"
            value={editedAsset.depnMethodTax || ""}
            onChange={(e) => handleChange("depnMethodTax", e.target.value)}
            className={getInputClass(editedAsset.depnMethodTax)}
            placeholder="e.g., Diminishing value"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depn Rate (Tax)
          </label>
          <input
            type="text"
            value={editedAsset.depnRateTax || ""}
            onChange={(e) => handleChange("depnRateTax", e.target.value)}
            className={getInputClass(editedAsset.depnRateTax)}
            placeholder="e.g., 0%"
          />
        </div>
      </div>

      {editedAsset.incomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-700">
            ⚠️ This asset is marked as incomplete. Please ensure all required fields are filled.
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <button
          onClick={onSkip}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isLast ? "Finish Import" : "Next"}
        </button>
      </div>
    </div>
  );
}