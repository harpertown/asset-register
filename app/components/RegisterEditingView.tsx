import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import type { Register, Room, Asset, Tool, Point } from "~/types";
import type { UseAssetWizard } from "~/hooks/useAssetWizard";
import type { UseOwnershipWizard } from "~/hooks/useOwnershipWizard";
import type { UseImportWizard } from "~/hooks/useImportWizard";
import type { UseDrawingCanvas } from "~/hooks/useDrawingCanvas";
import { apiService } from "~/services/api";
import DrawingToolbar from "./DrawingToolbar";
import OwnershipWizardModal from "./OwnershipWizardModal";
import RoomNamingModal from "./RoomNamingModal";
import ImportWizardModal from "./ImportWizardModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import AssetWizardModal from "./AssetWizardModal";
import AssetGroupModal from "./AssetGroupModal";
import RoomListSection from "./RoomListSection";
import IncompleteItemsSection from "./IncompleteItemsSection";

interface RegisterEditingViewProps {
  register: Register;
  // Drawing state
  wizardActive: boolean;
  setWizardActive: (active: boolean) => void;
  selectedTool: Tool;
  setSelectedTool: (tool: Tool) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  colors: string[];
  previewShape: Room | null;
  // Room state
  namingRoom: Room | null;
  setNamingRoom: (room: Room | null) => void;
  roomName: string;
  setRoomName: (name: string) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  confirmDeleteRoomId: string | null;
  setConfirmDeleteRoomId: (id: string | null) => void;
  // Hooks
  assetWizard: UseAssetWizard;
  ownershipWizard: UseOwnershipWizard;
  importWizard: UseImportWizard;
  drawingCanvas: UseDrawingCanvas;
  // Handlers
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSitePlan: () => void;
  onExportCSV: () => void;
  onCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveRoom: (e: React.FormEvent) => void;
  onDeleteRoom: (roomId: string) => void;
  onAddAsset: (e: React.FormEvent) => void;
  onDeleteAsset: (roomId: string, assetId: string) => void;
  onAssetPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Ownership handlers
  onOwnershipQuestionsNext: () => void;
  onOwnershipWizardContinue: () => void;
  onOwnershipWizardSkip: () => void;
  onOwnershipValuesSkip: () => void;
  startAssetRegisterWizard: () => void;
  startAddRoom: () => void;
  // Asset group handlers
  onAddAssetGroup: (name: string, color: string) => Promise<Room>;
  onAddSingleAsset: () => Promise<void>;
  // Import handlers
  onImportNext: () => void;
  onImportSkip: () => void;
  onImportEdit: (asset: any) => void;
  closeImportWizard: () => void;
  // Asset wizard handlers
  openAssetWizard: (roomId: string) => void;
  closeAssetWizard: () => void;
  onAssetWizardYes: () => void;
  onAssetWizardNo: () => void;
  onItemTypeChange: (value: string) => void;
  onSelectItemType: (type: string) => void;
  // Incomplete section
  incompleteSectionExpanded: boolean;
  setIncompleteSectionExpanded: (expanded: boolean) => void;
  // Render function
  renderShape: (room: Room, isPreview?: boolean) => React.ReactNode;
  // Refs
  canvasRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importFileInputRef: React.RefObject<HTMLInputElement | null>;
  // Back handler
  onBack: () => void;
}

export default function RegisterEditingView({
  register,
  wizardActive,
  setWizardActive,
  selectedTool,
  setSelectedTool,
  selectedColor,
  setSelectedColor,
  colors,
  previewShape,
  namingRoom,
  setNamingRoom,
  roomName,
  setRoomName,
  selectedRoomId,
  setSelectedRoomId,
  confirmDeleteRoomId,
  setConfirmDeleteRoomId,
  assetWizard,
  ownershipWizard,
  importWizard,
  drawingCanvas,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onFileUpload,
  onRemoveSitePlan,
  onExportCSV,
  onCSVImport,
  onSaveRoom,
  onDeleteRoom,
  onAddAsset,
  onDeleteAsset,
  onAssetPhotoUpload,
  onOwnershipQuestionsNext,
  onOwnershipWizardContinue,
  onOwnershipWizardSkip,
  onOwnershipValuesSkip,
  startAssetRegisterWizard,
  startAddRoom,
  onAddAssetGroup,
  onAddSingleAsset,
  onImportNext,
  onImportSkip,
  onImportEdit,
  closeImportWizard,
  openAssetWizard,
  closeAssetWizard,
  onAssetWizardYes,
  onAssetWizardNo,
  onItemTypeChange,
  onSelectItemType,
  incompleteSectionExpanded,
  setIncompleteSectionExpanded,
  renderShape,
  canvasRef,
  fileInputRef,
  importFileInputRef,
  onBack,
}: RegisterEditingViewProps) {
  const navigate = useNavigate();
  const [showAssetGroupModal, setShowAssetGroupModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [selectedDebugAsset, setSelectedDebugAsset] = useState<Asset | null>(null);
  const [versionHistory, setVersionHistory] = useState<Asset[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [debugSortColumn, setDebugSortColumn] = useState<"id" | "assetId" | "name">("assetId");
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<Asset | null>(null);
  const [showAcquisitionReassignModal, setShowAcquisitionReassignModal] = useState(false);
  const [debugSortDirection, setDebugSortDirection] = useState<"asc" | "desc">("asc");
  
  const wizardRoom = assetWizard.state.roomId
    ? register.rooms.find((r) => r.id === assetWizard.state.roomId)
    : null;

  const handleDebugSort = (column: "id" | "assetId" | "name") => {
    if (debugSortColumn === column) {
      setDebugSortDirection(debugSortDirection === "asc" ? "desc" : "asc");
    } else {
      setDebugSortColumn(column);
      setDebugSortDirection("asc");
    }
  };

  const sortedDebugAssets = useMemo(() => {
    const allAssets = register.rooms.flatMap(room => room.assets);
    return [...allAssets].sort((a, b) => {
      let aVal: string, bVal: string;
      switch (debugSortColumn) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "assetId":
          aVal = a.assetId || "";
          bVal = b.assetId || "";
          break;
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        default:
          return 0;
      }
      const comparison = aVal.localeCompare(bVal);
      return debugSortDirection === "asc" ? comparison : -comparison;
    });
  }, [register.rooms, debugSortColumn, debugSortDirection]);

  const handleCreateAssetGroup = async (name: string, color: string) => {
    await onAddAssetGroup(name, color);
    setShowAssetGroupModal(false);
  };

  const handleAssetClick = async (asset: Asset) => {
    setSelectedDebugAsset(asset);
    setIsLoadingVersions(true);
    try {
      // Always use the row id; get_asset_versions expects the asset record id,
      // not the version GUID.
      const result = await apiService.getAssetVersions(asset.id);
      if (result.versions.length > 0) {
        setVersionHistory(result.versions);
      } else {
        // Fallback to just the current asset if no versions found
        setVersionHistory([asset]);
      }
    } catch (err) {
      console.error("Failed to load version history:", err);
      setVersionHistory([asset]); // Fallback to just the current asset
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const closeVersionHistory = () => {
    setSelectedDebugAsset(null);
    setVersionHistory([]);
  };

  const handleDeleteVersion = async (versionId: string) => {
    // Find the version being deleted
    const versionToDelete = versionHistory.find(v => v.id === versionId);
    
    // Check if it's an Acquisition version and there are other versions
    if (versionToDelete?.exemptionType === "Acquisition" && versionHistory.length > 1) {
      setPendingDeleteVersion(versionToDelete);
      setShowAcquisitionReassignModal(true);
      return;
    }
    
    if (!confirm("Are you sure you want to delete this version? This cannot be undone.")) {
      return;
    }
    
    await performDeleteVersion(versionId);
  };

  const performDeleteVersion = async (versionId: string) => {
    try {
      await apiService.deleteAssetVersion(versionId);
      
      // Find another version to use for reloading (not the one being deleted)
      const remainingVersion = versionHistory.find(v => v.id !== versionId);
      
      if (remainingVersion) {
        // Refresh version history using a remaining version's ID
        const result = await apiService.getAssetVersions(remainingVersion.id);
        setVersionHistory(result.versions);
        
        // If we deleted the selected asset, update to show the latest version
        if (versionId === selectedDebugAsset?.id && result.versions.length > 0) {
          setSelectedDebugAsset(result.versions[result.versions.length - 1]);
        }
      } else {
        // No versions left - close the version history view
        setVersionHistory([]);
        setSelectedDebugAsset(null);
      }
    } catch (err) {
      console.error("Failed to delete version:", err);
      alert("Failed to delete version. It may be the only version of this asset.");
    }
  };

  const handleReassignAcquisition = async (newAcquisitionVersionId: string) => {
    if (!pendingDeleteVersion) return;
    
    try {
      // Update the selected version to be the new Acquisition
      await apiService.updateAsset({
        id: newAcquisitionVersionId,
        exemptionType: "Acquisition",
      });
      
      // Now delete the old Acquisition version
      await performDeleteVersion(pendingDeleteVersion.id);
      
      // Close modal and clear state
      setShowAcquisitionReassignModal(false);
      setPendingDeleteVersion(null);
    } catch (err) {
      console.error("Failed to reassign Acquisition:", err);
      alert("Failed to reassign Acquisition type.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      <h1 className="text-2xl font-semibold text-gray-900">Edit Register</h1>
      <p className="text-gray-600 mb-6">{register.address}</p>
      {register.wizardCompleted && register.rooms.length > 0 && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => navigate(`/transactions/${register.id}`)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View All Assets
          </button>
          <button
            onClick={() => setShowDebugModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Debug Assets
          </button>
        </div>
      )}

      {/* Debug Assets Modal */}
      {showDebugModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Debug Assets - {register.address}
              </h2>
              <button
                onClick={() => { setShowDebugModal(false); closeVersionHistory(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {!selectedDebugAsset ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Total Assets: {register.rooms.flatMap(r => r.assets).length} — Click an asset to view version history
                </p>
                <div className="overflow-auto flex-1">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th 
                          className="px-3 py-2 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200 select-none"
                          onClick={() => handleDebugSort("id")}
                        >
                          <div className="flex items-center gap-1">
                            Asset GUID
                            <span className="text-gray-400 text-xs">
                              {debugSortColumn === "id" ? (debugSortDirection === "asc" ? "▲" : "▼") : "○"}
                            </span>
                          </div>
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                          Version GUID
                        </th>
                        <th 
                          className="px-3 py-2 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200 select-none"
                          onClick={() => handleDebugSort("assetId")}
                        >
                          <div className="flex items-center gap-1">
                            Asset ID
                            <span className="text-gray-400 text-xs">
                              {debugSortColumn === "assetId" ? (debugSortDirection === "asc" ? "▲" : "▼") : "○"}
                            </span>
                          </div>
                        </th>
                        <th 
                          className="px-3 py-2 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200 select-none"
                          onClick={() => handleDebugSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            <span className="text-gray-400 text-xs">
                              {debugSortColumn === "name" ? (debugSortDirection === "asc" ? "▲" : "▼") : "○"}
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDebugAssets.map((asset) => (
                        <tr 
                          key={asset.id} 
                          className="border-b hover:bg-blue-50 cursor-pointer"
                          onClick={() => handleAssetClick(asset)}
                        >
                          <td className="px-3 py-2 text-gray-900 font-mono text-xs">{asset.assetGuid || asset.id}</td>
                          <td className="px-3 py-2 text-gray-900 font-mono text-xs">{asset.versionId || asset.id}</td>
                          <td className="px-3 py-2 text-gray-900">{asset.assetId || "-"}</td>
                          <td className="px-3 py-2 text-gray-900">{asset.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={closeVersionHistory}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to list
                  </button>
                </div>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedDebugAsset.name}</p>
                  <p className="text-sm text-gray-600">Asset ID: {selectedDebugAsset.assetId || "-"}</p>
                  <p className="text-sm text-gray-500 font-mono">Asset GUID: {selectedDebugAsset.assetGuid || selectedDebugAsset.id}</p>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Version History ({versionHistory.length} version{versionHistory.length !== 1 ? "s" : ""})</h3>
                {isLoadingVersions ? (
                  <div className="text-gray-500 py-4 text-center">Loading version history...</div>
                ) : (
                  <div className="overflow-auto flex-1 space-y-3">
                    {versionHistory.map((version, i) => (
                      <div 
                        key={version.id} 
                        className={`p-4 border rounded-lg ${i === versionHistory.length - 1 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {/* Only show version number if there are multiple versions */}
                            {versionHistory.length > 1 && (
                              <span className="font-medium text-gray-900">
                                Version {version.version || 1}
                              </span>
                            )}
                            {i === versionHistory.length - 1 && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Current</span>}
                            {/* Exemption Type Badge */}
                            {(versionHistory.length === 1 || version.exemptionType) && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                versionHistory.length === 1 || version.exemptionType === "Acquisition"
                                  ? "bg-green-100 text-green-700"
                                  : version.exemptionType === "Disposal"
                                  ? "bg-red-100 text-red-700"
                                  : version.exemptionType === "Revaluation"
                                  ? "bg-purple-100 text-purple-700"
                                  : version.exemptionType === "Impairment"
                                  ? "bg-orange-100 text-orange-700"
                                  : version.exemptionType === "Improvement"
                                  ? "bg-blue-100 text-blue-700"
                                  : version.exemptionType === "Marked unavailable for use"
                                  ? "bg-amber-100 text-amber-700"
                                  : version.exemptionType === "Marked available for use"
                                  ? "bg-teal-100 text-teal-700"
                                  : version.exemptionType === "Change depn method or value"
                                  ? "bg-cyan-100 text-cyan-700"
                                  : version.exemptionType === "Reclassify asset category"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {versionHistory.length === 1
                                  ? "Acquisition"
                                  : version.exemptionType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {version.effectiveFrom && (
                              <span className="text-sm text-gray-500">Effective: {version.effectiveFrom}</span>
                            )}
                            {versionHistory.length > 1 && (
                              <button
                                onClick={() => handleDeleteVersion(version.id)}
                                className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded"
                                title="Delete this version"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {(() => {
                          const prev = i > 0 ? versionHistory[i - 1] : null;
                          const changed = (field: keyof Asset) => {
                            if (!prev) return false;
                            const prevVal = prev[field];
                            const currVal = version[field];
                            // Handle undefined/null/empty string as equivalent
                            const normalize = (v: any) => v === undefined || v === null || v === "" ? "" : String(v);
                            return normalize(prevVal) !== normalize(currVal);
                          };
                          const highlightClass = "bg-green-100 px-1 rounded";
                          
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              <div className="col-span-2 md:col-span-3">
                                <span className="text-gray-500">Version GUID:</span>
                                <span className="ml-1 font-mono text-xs text-gray-700">{version.versionId || version.id}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Name:</span>
                                <span className={`ml-1 text-gray-900 ${changed("name") ? highlightClass : ""}`}>{version.name}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Type:</span>
                                <span className={`ml-1 text-gray-900 ${changed("itemType") ? highlightClass : ""}`}>{version.itemType || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Price:</span>
                                <span className={`ml-1 text-gray-900 ${changed("purchasePrice") ? highlightClass : ""}`}>${version.purchasePrice?.toLocaleString() || "0"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Purchase Date:</span>
                                <span className={`ml-1 text-gray-900 ${changed("purchaseDate") ? highlightClass : ""}`}>{version.purchaseDate || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Serial:</span>
                                <span className={`ml-1 text-gray-900 ${changed("serialNumber") ? highlightClass : ""}`}>{version.serialNumber || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Acc Method:</span>
                                <span className={`ml-1 text-gray-900 ${changed("depnMethodAcc") ? highlightClass : ""}`}>{version.depnMethodAcc || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Acc Rate:</span>
                                <span className={`ml-1 text-gray-900 ${changed("depnRateAcc") ? highlightClass : ""}`}>{version.depnRateAcc ? `${version.depnRateAcc}%` : "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Tax Method:</span>
                                <span className={`ml-1 text-gray-900 ${changed("depnMethodTax") ? highlightClass : ""}`}>{version.depnMethodTax || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Tax Rate:</span>
                                <span className={`ml-1 text-gray-900 ${changed("depnRateTax") ? highlightClass : ""}`}>{version.depnRateTax ? `${version.depnRateTax}%` : "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <span className={`ml-1 ${version.incomplete ? 'text-amber-600' : 'text-green-600'} ${changed("incomplete") ? highlightClass : ""}`}>
                                  {version.incomplete ? "Incomplete" : "Complete"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <button
                onClick={() => { setShowDebugModal(false); closeVersionHistory(); }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acquisition Reassignment Modal */}
      {showAcquisitionReassignModal && pendingDeleteVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Reassign Acquisition
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You are deleting the "Acquisition" version. Please select another version to become the new Acquisition:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {versionHistory
                .filter(v => v.id !== pendingDeleteVersion.id)
                .map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleReassignAcquisition(version.id)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">Version {version.version || 1}</span>
                        {version.exemptionType && version.exemptionType !== "Acquisition" && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {version.exemptionType}
                          </span>
                        )}
                      </div>
                      {version.effectiveFrom && (
                        <span className="text-sm text-gray-500">{version.effectiveFrom}</span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowAcquisitionReassignModal(false);
                  setPendingDeleteVersion(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(register.sitePlan || register.wizardCompleted) ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-5xl">
          {/* Toolbar - only show full toolbar when there's a site plan */}
          {register.sitePlan ? (
            <DrawingToolbar
              wizardActive={wizardActive}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              colors={colors}
              onStartWizard={startAssetRegisterWizard}
              onAddRoom={startAddRoom}
              onAddSingleAsset={onAddSingleAsset}
              onDoneDrawing={() => {
                setWizardActive(false);
                setSelectedRoomId(null);
              }}
              onExportCSV={onExportCSV}
              onImportCSV={() => importFileInputRef.current?.click()}
              onRemoveSitePlan={onRemoveSitePlan}
              importFileInputRef={importFileInputRef}
              onImportFileChange={onCSVImport}
              registerCompleted={register.wizardCompleted ?? false}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAssetGroupModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Add Asset Group
              </button>
              <button
                onClick={onAddSingleAsset}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Add Single Asset
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Add Site Plan
              </button>
              <button
                onClick={onExportCSV}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => importFileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Import CSV
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv"
                onChange={onCSVImport}
                className="hidden"
              />
            </div>
          )}

          {wizardActive && register.sitePlan && (
            <p className="text-sm text-blue-600">
              Draw on the site plan to mark rooms. Use {selectedTool === "rectangle" ? "click and drag to draw rectangles" : selectedTool === "circle" ? "click and drag to draw circles" : "click and drag to draw freeform shapes"}.
            </p>
          )}

          {/* Site plan with drawing canvas */}
          {register.sitePlan && (
            <div
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              className={`relative border border-gray-300 rounded-lg overflow-hidden select-none ${
                wizardActive ? "cursor-crosshair" : ""
              }`}
            >
              <img
                src={register.sitePlan}
                alt="Site Plan"
                className="max-w-full max-h-[60vh] object-contain"
                draggable={false}
              />
              {/* Render existing rooms */}
              {register.rooms.map((room) => renderShape(room))}
              {/* Render preview shape */}
              {previewShape && renderShape(previewShape, true)}
            </div>
          )}

          {/* Room naming modal */}
          <RoomNamingModal
            namingRoom={namingRoom}
            roomName={roomName}
            onRoomNameChange={setRoomName}
            onSave={onSaveRoom}
            onCancel={() => {
              setNamingRoom(null);
              setRoomName("");
            }}
          />

          {/* Import Wizard Modal */}
          <ImportWizardModal
            showImportWizard={importWizard.state.isOpen}
            importedAssets={importWizard.state.importedAssets}
            currentImportIndex={importWizard.state.currentIndex}
            onClose={closeImportWizard}
            onSave={onImportEdit}
            onNext={onImportNext}
            onSkip={onImportSkip}
            isLast={importWizard.isLastAsset}
            onEdit={onImportEdit}
          />

          {/* Confirm Delete Room Modal */}
          <ConfirmDeleteModal
            confirmDeleteRoomId={confirmDeleteRoomId}
            roomName={register.rooms.find(r => r.id === confirmDeleteRoomId)?.name ?? ""}
            onConfirm={() => {
              onDeleteRoom(confirmDeleteRoomId!);
              setConfirmDeleteRoomId(null);
            }}
            onCancel={() => setConfirmDeleteRoomId(null)}
          />

          {/* Asset Wizard Modal */}
          <AssetWizardModal
            isOpen={assetWizard.isOpen}
            wizardRoom={wizardRoom ?? null}
            step={assetWizard.state.step}
            isEditing={assetWizard.isEditing}
            state={{
              itemType: assetWizard.state.itemType,
              name: assetWizard.state.name,
              assetId: assetWizard.state.assetId,
              serialNumber: assetWizard.state.serialNumber,
              purchasePrice: assetWizard.state.purchasePrice,
              purchaseDate: assetWizard.state.purchaseDate,
              photo: assetWizard.state.photo,
              itemTypeSuggestions: assetWizard.state.itemTypeSuggestions,
              showItemTypeSuggestions: assetWizard.state.showItemTypeSuggestions,
            }}
            refs={assetWizard.refs}
            onClose={closeAssetWizard}
            onYes={onAssetWizardYes}
            onNo={onAssetWizardNo}
            onItemTypeChange={onItemTypeChange}
            onItemTypeSelect={onSelectItemType}
            onItemTypeFocus={() => {
              if (assetWizard.state.itemType.length >= 1 && assetWizard.state.itemTypeSuggestions.length > 0) {
                assetWizard.actions.setField("showItemTypeSuggestions", true);
              }
            }}
            onFieldChange={(field, value) => assetWizard.actions.setField(field as any, value)}
            onPhotoUpload={onAssetPhotoUpload}
            onAddAsset={onAddAsset}
            onEditAsset={(asset) => {
              assetWizard.actions.populateForEdit({
                id: asset.id,
                itemType: asset.itemType || "",
                name: asset.name,
                assetId: asset.assetId,
                serialNumber: asset.serialNumber || "",
                purchasePrice: asset.purchasePrice,
                purchaseDate: asset.purchaseDate || "",
                photo: asset.photo,
              });
            }}
          />

          {/* Selected room actions */}
          {selectedRoomId && !wizardActive && (
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
              <span className="text-gray-700">
                Selected: {register.rooms.find((r) => r.id === selectedRoomId)?.name}
              </span>
              {!register.rooms.find((r) => r.id === selectedRoomId)?.isWholeSite && (
                <button
                  onClick={() => onDeleteRoom(selectedRoomId)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Delete Room
                </button>
              )}
              <button
                onClick={() => setSelectedRoomId(null)}
                className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              >
                Deselect
              </button>
            </div>
          )}

          {/* Room list */}
          <RoomListSection
            rooms={register.rooms}
            selectedRoomId={selectedRoomId}
            wizardActive={wizardActive}
            assetWizardOpen={assetWizard.isOpen}
            onRoomClick={setSelectedRoomId}
            onAddAssets={openAssetWizard}
            onRemoveRoom={setConfirmDeleteRoomId}
            onEditAsset={(roomId, asset) => {
              assetWizard.actions.openWizard(roomId);
              assetWizard.actions.populateForEdit({
                id: asset.id,
                itemType: asset.itemType || "",
                name: asset.name,
                assetId: asset.assetId,
                serialNumber: asset.serialNumber || "",
                purchasePrice: asset.purchasePrice,
                purchaseDate: asset.purchaseDate || "",
                photo: asset.photo,
              });
            }}
            onDeleteAsset={onDeleteAsset}
          />

          {/* Incomplete Items Section */}
          <IncompleteItemsSection
            register={register}
            incompleteSectionExpanded={incompleteSectionExpanded}
            setIncompleteSectionExpanded={setIncompleteSectionExpanded}
            onEditAsset={(roomId, asset) => {
              assetWizard.actions.openWizard(roomId);
              assetWizard.actions.populateForEdit({
                id: asset.id,
                itemType: asset.itemType || "",
                name: asset.name,
                assetId: asset.assetId,
                serialNumber: asset.serialNumber || "",
                purchasePrice: asset.purchasePrice,
                purchaseDate: asset.purchaseDate || "",
                photo: asset.photo,
              });
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-80 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            <svg
              className="w-12 h-12 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500">Click to upload site plan</p>
            <p className="text-gray-400 text-sm">PNG, JPG up to 10MB</p>
          </div>
          <button
            onClick={startAssetRegisterWizard}
            className="text-gray-500 hover:text-gray-700 underline text-sm"
          >
            Skip — I don't have a site plan
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileUpload}
        className="hidden"
      />

      {/* Ownership Wizard Modal - rendered outside conditional so it works when skipping site plan */}
      {ownershipWizard.state.isOpen && (
        <OwnershipWizardModal
          ownershipWizardStep={ownershipWizard.state.step}
          ownsLand={ownershipWizard.state.ownsLand}
          setOwnsLand={ownershipWizard.actions.setOwnsLand}
          ownsBuildings={ownershipWizard.state.ownsBuildings}
          setOwnsBuildings={ownershipWizard.actions.setOwnsBuildings}
          landValue={ownershipWizard.state.landValue}
          setLandValue={ownershipWizard.actions.setLandValue}
          landPurchaseDate={ownershipWizard.state.landPurchaseDate}
          setLandPurchaseDate={ownershipWizard.actions.setLandPurchaseDate}
          buildingsValue={ownershipWizard.state.buildingsValue}
          setBuildingsValue={ownershipWizard.actions.setBuildingsValue}
          buildingsPurchaseDate={ownershipWizard.state.buildingsPurchaseDate}
          setBuildingsPurchaseDate={ownershipWizard.actions.setBuildingsPurchaseDate}
          onClose={ownershipWizard.actions.closeWizard}
          onQuestionsNext={onOwnershipQuestionsNext}
          onValuesSkip={onOwnershipValuesSkip}
          onContinue={onOwnershipWizardContinue}
          onBack={() => ownershipWizard.actions.setStep("questions")}
          onSkip={onOwnershipWizardSkip}
          ownsLandDisabled={false}
          ownsBuildingsDisabled={false}
        />
      )}

      {/* Asset Group Modal */}
      <AssetGroupModal
        isOpen={showAssetGroupModal}
        onClose={() => setShowAssetGroupModal(false)}
        onSave={handleCreateAssetGroup}
        existingNames={register.rooms.map(r => r.name)}
      />

      <button
        onClick={onBack}
        className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        Back
      </button>
    </div>
  );
}
