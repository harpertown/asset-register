import { useRef, useEffect } from "react";
import type { Room, WizardStep, Asset } from "~/types";
import { formatCurrency } from "~/utils";

interface AssetWizardModalProps {
  isOpen: boolean;
  wizardRoom: Room | null;
  step: WizardStep;
  isEditing: boolean;
  state: {
    itemType: string;
    name: string;
    assetId: string;
    serialNumber: string;
    purchasePrice: string;
    purchaseDate: string;
    photo: string | null;
    itemTypeSuggestions: string[];
    showItemTypeSuggestions: boolean;
  };
  refs: {
    itemTypeInputRef: React.RefObject<HTMLInputElement | null>;
    itemTypeSuggestionsRef: React.RefObject<HTMLUListElement | null>;
  };
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
  onItemTypeChange: (value: string) => void;
  onItemTypeSelect: (type: string) => void;
  onItemTypeFocus: () => void;
  onFieldChange: (field: string, value: string | null) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddAsset: (e: React.FormEvent) => void;
  onEditAsset: (asset: Asset) => void;
}

const ASSET_CATEGORIES = [
  "Computers and laptops",
  "Computer hardware, including printers",
  "Computer software programs",
  "Photocopiers",
  "Office furniture",
  "Tools of the trade",
  "Plant or machinery used for production",
  "Art",
  "Motor vehicles",
];

export default function AssetWizardModal({
  isOpen,
  wizardRoom,
  step,
  isEditing,
  state,
  refs,
  onClose,
  onYes,
  onNo,
  onItemTypeChange,
  onItemTypeSelect,
  onItemTypeFocus,
  onFieldChange,
  onPhotoUpload,
  onAddAsset,
  onEditAsset,
}: AssetWizardModalProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        refs.itemTypeSuggestionsRef.current &&
        !refs.itemTypeSuggestionsRef.current.contains(event.target as Node) &&
        refs.itemTypeInputRef.current &&
        !refs.itemTypeInputRef.current.contains(event.target as Node)
      ) {
        // Don't hide suggestions here since they're handled differently
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [refs]);

  if (!isOpen || !wizardRoom) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-lg w-full mx-4">
        {step === "question" && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Assets to {wizardRoom.name}
            </h3>
            <p className="text-gray-700 mb-4">
              Does this space contain any of the following?
            </p>
            <ul className="list-disc list-inside mb-6 text-gray-600 space-y-1">
              {ASSET_CATEGORIES.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onNo}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                No
              </button>
              <button
                onClick={onYes}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Yes
              </button>
            </div>
          </>
        )}

        {step === "addItem" && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Assets to {wizardRoom.name}
            </h3>
            <form onSubmit={onAddAsset} className="flex flex-col gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type (IRD Depreciation Guide)
                </label>
                <input
                  ref={refs.itemTypeInputRef}
                  type="text"
                  value={state.itemType}
                  onChange={(e) => onItemTypeChange(e.target.value)}
                  onFocus={onItemTypeFocus}
                  placeholder="Start typing to search..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                  autoFocus
                />
                {state.showItemTypeSuggestions && state.itemTypeSuggestions.length > 0 && (
                  <ul
                    ref={refs.itemTypeSuggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    {state.itemTypeSuggestions.map((type, index) => (
                      <li
                        key={index}
                        onClick={() => onItemTypeSelect(type)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 text-sm"
                      >
                        {type}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                  placeholder="e.g., Dell XPS 15, Standing Desk..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID
                </label>
                <input
                  type="text"
                  value={state.assetId}
                  onChange={(e) => onFieldChange("assetId", e.target.value)}
                  placeholder="e.g., ASSET-001, INV-123..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={state.serialNumber}
                  onChange={(e) => onFieldChange("serialNumber", e.target.value)}
                  placeholder="e.g., SN123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price (NZD)
                </label>
                <input
                  type="number"
                  value={state.purchasePrice}
                  onChange={(e) => onFieldChange("purchasePrice", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={state.purchaseDate}
                  onChange={(e) => onFieldChange("purchaseDate", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (optional)
                </label>
                {state.photo ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={state.photo}
                      alt="Asset preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => onFieldChange("photo", null)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove photo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm text-gray-500">Upload photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Show already added assets */}
              {wizardRoom.assets.length > 0 && !isEditing && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Assets added ({wizardRoom.assets.length}):
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {wizardRoom.assets.map((asset) => (
                      <li
                        key={asset.id}
                        className="text-sm text-gray-600 flex justify-between items-center"
                      >
                        <span>{asset.itemType}: {asset.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(asset.purchasePrice)}</span>
                          <button
                            type="button"
                            onClick={() => onEditAsset(asset)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!state.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Save asset"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}