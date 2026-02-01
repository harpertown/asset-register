import { useState, useRef, useEffect } from "react";
import type { Room, WizardStep } from "~/types";

interface AssetWizardModalProps {
  assetWizardStep: WizardStep;
  wizardRoom: Room | null;
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
  newAssetItemType: string;
  onItemTypeChange: (value: string) => void;
  itemTypeSuggestions: string[];
  showItemTypeSuggestions: boolean;
  onItemTypeSelect: (type: string) => void;
  newAssetName: string;
  onNameChange: (value: string) => void;
  newAssetId: string;
  onIdChange: (value: string) => void;
  newAssetSerialNumber: string;
  onSerialNumberChange: (value: string) => void;
  newAssetPurchasePrice: string;
  onPurchasePriceChange: (value: string) => void;
  newAssetPurchaseDate: string;
  onPurchaseDateChange: (value: string) => void;
  newAssetPhoto: string | null;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onAddAsset: (e: React.FormEvent) => void;
  editingAssetId: string | null;
  assetWizardRoomId: string | null;
  wizardRoomAssets: any[];
  onEditAsset: (asset: any) => void;
  onCancelEdit: () => void;
}

export default function AssetWizardModal({
  assetWizardStep,
  wizardRoom,
  onClose,
  onYes,
  onNo,
  newAssetItemType,
  onItemTypeChange,
  itemTypeSuggestions,
  showItemTypeSuggestions,
  onItemTypeSelect,
  newAssetName,
  onNameChange,
  newAssetId,
  onIdChange,
  newAssetSerialNumber,
  onSerialNumberChange,
  newAssetPurchasePrice,
  onPurchasePriceChange,
  newAssetPurchaseDate,
  onPurchaseDateChange,
  newAssetPhoto,
  onPhotoUpload,
  onRemovePhoto,
  onAddAsset,
  editingAssetId,
  wizardRoomAssets,
  onEditAsset,
  onCancelEdit
}: AssetWizardModalProps) {
  const itemTypeInputRef = useRef<HTMLInputElement>(null);
  const itemTypeSuggestionsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        itemTypeSuggestionsRef.current &&
        !itemTypeSuggestionsRef.current.contains(event.target as Node) &&
        itemTypeInputRef.current &&
        !itemTypeInputRef.current.contains(event.target as Node)
      ) {
        // Don't hide suggestions here since they're handled differently
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  if (!wizardRoom) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-lg w-full mx-4">
        {assetWizardStep === "question" && (
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

        {assetWizardStep === "addItem" && (
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
                  ref={itemTypeInputRef}
                  type="text"
                  value={newAssetItemType}
                  onChange={(e) => onItemTypeChange(e.target.value)}
                  onFocus={() => {
                    if (newAssetItemType.length >= 1 && itemTypeSuggestions.length > 0) {
                      // This would be handled by parent component
                    }
                  }}
                  placeholder="Start typing to search..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                  autoFocus
                />
                {showItemTypeSuggestions && itemTypeSuggestions.length > 0 && (
                  <ul
                    ref={itemTypeSuggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    {itemTypeSuggestions.map((type, index) => (
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
                  value={newAssetName}
                  onChange={(e) => onNameChange(e.target.value)}
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
                  value={newAssetId}
                  onChange={(e) => onIdChange(e.target.value)}
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
                  value={newAssetSerialNumber}
                  onChange={(e) => onSerialNumberChange(e.target.value)}
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
                  value={newAssetPurchasePrice}
                  onChange={(e) => onPurchasePriceChange(e.target.value)}
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
                  value={newAssetPurchaseDate}
                  onChange={(e) => onPurchaseDateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (optional)
                </label>
                {newAssetPhoto ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={newAssetPhoto}
                      alt="Asset preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={onRemovePhoto}
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
              {wizardRoomAssets.length > 0 && !editingAssetId && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Assets added ({wizardRoomAssets.length}):
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {wizardRoomAssets.map((asset) => (
                      <li
                        key={asset.id}
                        className="text-sm text-gray-600 flex justify-between items-center"
                      >
                        <span>{asset.itemType}: {asset.name}</span>
                        <div className="flex items-center gap-2">
                          <span>${asset.purchasePrice}</span>
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
                  onClick={onCancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!newAssetName.trim()}
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