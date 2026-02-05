import { useState } from "react";
import type { Register } from "~/types";
import type { DepreciationResult } from "~/services/depreciationService";
import DepreciationModal from "./DepreciationModal";
import { formatCurrency } from "~/utils";

// Helper functions to compute metrics
function getAssetCount(register: Register): number {
  return register.rooms.reduce((sum, room) => sum + room.assets.length, 0);
}

function getTotalValue(register: Register): number {
  return register.rooms.reduce((sum, room) => 
    sum + room.assets.reduce((assetSum, asset) => assetSum + (asset.purchasePrice || 0), 0), 0
  );
}

function getIncompleteCount(register: Register): number {
  return register.rooms.reduce((sum, room) => 
    sum + room.assets.filter(asset => {
      // Check standard incomplete flag OR missing depreciation settings
      const missingDepreciation = !asset.depnMethodAcc || !asset.depnRateAcc || !asset.depnMethodTax || !asset.depnRateTax;
      return asset.incomplete || missingDepreciation;
    }).length, 0
  );
}

interface RegisterListViewProps {
  registers: Register[];
  isLoading: boolean;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  address: string;
  suggestions: string[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onAddressChange: (value: string) => void;
  onSelectSuggestion: (suggestion: string) => void;
  onCreateRegister: (e: React.FormEvent) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onCancelCreate: () => void;
  // Depreciation modal
  showDepreciationModal: boolean;
  depreciationResults: DepreciationResult[];
  financialYear: string;
  onCloseDepreciationModal: () => void;
  // Refs
  inputRef: React.RefObject<HTMLInputElement | null>;
  suggestionsRef: React.RefObject<HTMLUListElement | null>;
}

export default function RegisterListView({
  registers,
  isLoading,
  isCreating,
  setIsCreating,
  address,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  onAddressChange,
  onSelectSuggestion,
  onCreateRegister,
  onEdit,
  onDelete,
  onCancelCreate,
  showDepreciationModal,
  depreciationResults,
  financialYear,
  onCloseDepreciationModal,
  inputRef,
  suggestionsRef,
}: RegisterListViewProps) {
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  const handleDeleteClick = (index: number) => {
    setConfirmDeleteIndex(index);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteIndex !== null) {
      onDelete(confirmDeleteIndex);
      setConfirmDeleteIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-semibold text-gray-900">Asset Register</h1>

      {isCreating ? (
        <form onSubmit={onCreateRegister} className="flex flex-col items-center gap-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Start typing an address..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900 w-80"
              autoFocus
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onClick={() => onSelectSuggestion(suggestion)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 text-sm"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancelCreate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Create New Register
        </button>
      )}

      {isLoading && (
        <div className="text-gray-500">Loading registers...</div>
      )}

      {!isLoading && registers.length > 0 && (
        <div className="w-full max-w-2xl">
          <ul className="space-y-3">
            {registers.map((register, index) => {
              const assetCount = getAssetCount(register);
              const totalValue = getTotalValue(register);
              const incompleteCount = getIncompleteCount(register);
              
              return (
                <li
                  key={register.id || index}
                  className="px-4 py-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-medium">{register.address}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {register.rooms.length} {register.rooms.length === 1 ? 'group' : 'groups'}
                        </span>
                        {totalValue > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {formatCurrency(totalValue)}
                          </span>
                        )}
                        {incompleteCount > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                            {incompleteCount} incomplete
                          </span>
                        )}
                        {register.sitePlan && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Has site plan
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => onEdit(index)}
                        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(index)}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Register</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{registers[confirmDeleteIndex]?.address}"? 
              This will permanently delete all asset groups and assets within it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteIndex(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Results Modal */}
      <DepreciationModal
        showDepreciationModal={showDepreciationModal}
        depreciationResults={depreciationResults}
        financialYear={financialYear}
        onClose={onCloseDepreciationModal}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
