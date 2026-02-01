import ImportAssetForm from "~/components/ImportAssetForm";

interface ImportWizardModalProps {
  showImportWizard: boolean;
  importedAssets: any[];
  currentImportIndex: number;
  onClose: () => void;
  onSave: (editedAsset: any) => void;
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
  onEdit: (editedAsset: any) => void;
}

export default function ImportWizardModal({
  showImportWizard,
  importedAssets,
  currentImportIndex,
  onClose,
  onSave,
  onNext,
  onSkip,
  isLast,
  onEdit
}: ImportWizardModalProps) {
  if (!showImportWizard || importedAssets.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Import Assets ({currentImportIndex + 1} of {importedAssets.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ImportAssetForm
          asset={importedAssets[currentImportIndex]}
          onSave={onEdit}
          onNext={onNext}
          onSkip={onSkip}
          isLast={isLast}
        />
      </div>
    </div>
  );
}