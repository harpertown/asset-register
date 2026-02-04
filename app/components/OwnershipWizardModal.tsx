import type { OwnershipWizardStep } from "~/types";
import ModalWrapper from "./ModalWrapper";

interface OwnershipWizardModalProps {
  ownershipWizardStep: OwnershipWizardStep;
  ownsLand: boolean | null;
  setOwnsLand: (value: boolean | null) => void;
  ownsBuildings: boolean | null;
  setOwnsBuildings: (value: boolean | null) => void;
  landValue: string;
  setLandValue: (value: string) => void;
  landPurchaseDate: string;
  setLandPurchaseDate: (value: string) => void;
  buildingsValue: string;
  setBuildingsValue: (value: string) => void;
  buildingsPurchaseDate: string;
  setBuildingsPurchaseDate: (value: string) => void;
  onClose: () => void;
  onQuestionsNext: () => void;
  onValuesSkip: () => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  ownsLandDisabled: boolean;
  ownsBuildingsDisabled: boolean;
}

export default function OwnershipWizardModal({
  ownershipWizardStep,
  ownsLand,
  setOwnsLand,
  ownsBuildings,
  setOwnsBuildings,
  landValue,
  setLandValue,
  landPurchaseDate,
  setLandPurchaseDate,
  buildingsValue,
  setBuildingsValue,
  buildingsPurchaseDate,
  setBuildingsPurchaseDate,
  onClose,
  onQuestionsNext,
  onValuesSkip,
  onContinue,
  onBack,
  onSkip,
  ownsLandDisabled,
  ownsBuildingsDisabled
}: OwnershipWizardModalProps) {
  const isOpen = ownershipWizardStep === "questions" || ownershipWizardStep === "values";

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
        {ownershipWizardStep === "questions" && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Site Ownership Questions
            </h3>

            <div className="space-y-6">
              <div>
                <p className="text-gray-700 mb-3">
                  Do you own the land the site is on?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOwnsLand(true)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      ownsLand === true
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={ownsLandDisabled}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setOwnsLand(false)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      ownsLand === false
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={ownsLandDisabled}
                  >
                    No
                  </button>
                </div>
              </div>

              <div>
                <p className="text-gray-700 mb-3">
                  Do you own any of the buildings (including leasing with an option to buy)?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOwnsBuildings(true)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      ownsBuildings === true
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={ownsBuildingsDisabled}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setOwnsBuildings(false)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      ownsBuildings === false
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={ownsBuildingsDisabled}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={onSkip}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={onQuestionsNext}
                disabled={ownsLand === null || ownsBuildings === null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}

        {ownershipWizardStep === "values" && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Enter Asset Values
            </h3>

            <div className="space-y-6">
              {ownsLand && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Land</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Value (NZD)
                      </label>
                      <input
                        type="number"
                        value={landValue}
                        onChange={(e) => setLandValue(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={landPurchaseDate}
                        onChange={(e) => setLandPurchaseDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {ownsBuildings && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Buildings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Value (NZD)
                      </label>
                      <input
                        type="number"
                        value={buildingsValue}
                        onChange={(e) => setBuildingsValue(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={buildingsPurchaseDate}
                        onChange={(e) => setBuildingsPurchaseDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={onValuesSkip}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={onContinue}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}
    </ModalWrapper>
  );
}