import { useRef } from "react";
import type { Register } from "~/types";
import type { DepreciationResult } from "~/services/depreciationService";
import DepreciationModal from "./DepreciationModal";
import { formatCurrency } from "~/utils";

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
  onCancelCreate,
  showDepreciationModal,
  depreciationResults,
  financialYear,
  onCloseDepreciationModal,
  inputRef,
  suggestionsRef,
}: RegisterListViewProps) {
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
        <div className="w-full max-w-md">
          <ul className="space-y-2">
            {registers.map((register, index) => (
              <li
                key={index}
                className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{register.address}</span>
                  {register.sitePlan && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {register.rooms.length} asset groups
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onEdit(index)}
                  className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
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
