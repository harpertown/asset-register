import type { Tool } from "~/types";

interface DrawingToolbarProps {
  wizardActive: boolean;
  selectedTool: Tool;
  setSelectedTool: (tool: Tool) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  colors: string[];
  onStartWizard: () => void;
  onAddRoom: () => void;
  onAddSingleAsset: () => void;
  onDoneDrawing: () => void;
  onExportCSV: () => void;
  onImportCSV: () => void;
  onRemoveSitePlan: () => void;
  importFileInputRef: React.RefObject<HTMLInputElement | null>;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  registerCompleted: boolean;
}

export default function DrawingToolbar({
  wizardActive,
  selectedTool,
  setSelectedTool,
  selectedColor,
  setSelectedColor,
  colors,
  onStartWizard,
  onAddRoom,
  onAddSingleAsset,
  onDoneDrawing,
  onExportCSV,
  onImportCSV,
  onRemoveSitePlan,
  importFileInputRef,
  onImportFileChange,
  registerCompleted
}: DrawingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      {!wizardActive && !registerCompleted ? (
        <>
          <button
            onClick={onStartWizard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Asset Register Wizard
          </button>
          <button
            onClick={onExportCSV}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={onImportCSV}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Import CSV
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onImportFileChange}
          />
          <button
            onClick={onRemoveSitePlan}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        </>
      ) : !wizardActive ? (
        <>
          <button
            onClick={onAddRoom}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Room
          </button>
          <button
            onClick={onAddSingleAsset}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Add Single Asset
          </button>
          <button
            onClick={onExportCSV}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={onImportCSV}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Import CSV
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onImportFileChange}
          />
          <button
            onClick={onRemoveSitePlan}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-600 mr-2">Tools:</span>
          <button
            onClick={() => setSelectedTool("rectangle")}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === "rectangle"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title="Rectangle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedTool("circle")}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === "circle"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title="Circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedTool("pen")}
            className={`p-2 rounded-lg transition-colors ${
              selectedTool === "pen"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title="Freeform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <span className="text-sm text-gray-600 mr-1">Color:</span>
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full transition-transform ${
                selectedColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
              }`}
              style={{ backgroundColor: color }}
            />
          ))}

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={onDoneDrawing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Done Drawing
          </button>
        </>
      )}
    </div>
  );
}