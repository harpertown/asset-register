import { useCallback } from "react";
import type { Register, Room, Asset } from "~/types";
import { parseCSVForImport } from "~/utils";
import type { UseImportWizard } from "./useImportWizard";
import { apiService, ApiError } from "~/services/api";
import { useToast } from "~/components/ToastProvider";

export interface UseCSVOperationsParams {
  registers: Register[];
  editingIndex: number | null;
  setRegisters: React.Dispatch<React.SetStateAction<Register[]>>;
  importWizard: UseImportWizard;
}

export interface UseCSVOperationsReturn {
  handleExportCSV: () => void;
  handleCSVImport: (e: React.ChangeEvent<HTMLInputElement>, fileInputRef: React.RefObject<HTMLInputElement | null>) => void;
  createImportGroup: () => Promise<void>;
  handleImportNext: () => Promise<void>;
  handleImportSkip: () => void;
  handleImportEdit: (editedAsset: Partial<Asset>) => void;
  closeImportWizard: () => void;
}

export function useCSVOperations({
  registers,
  editingIndex,
  setRegisters,
  importWizard,
}: UseCSVOperationsParams): UseCSVOperationsReturn {
  const { showError, showSuccess } = useToast();

  const handleExportCSV = useCallback(() => {
    if (editingIndex === null) return;

    const register = registers[editingIndex];
    const rows: string[][] = [];

    // Header row
    rows.push([
      "Asset Group",
      "Asset Name",
      "Item Type",
      "Serial Number",
      "Purchase Price (NZD)",
      "Purchase Date",
      "Status"
    ]);

    // Data rows
    register.rooms.forEach(room => {
      room.assets.forEach(asset => {
        rows.push([
          room.name,
          asset.name,
          asset.itemType || "",
          asset.serialNumber || "",
          asset.purchasePrice > 0 ? asset.purchasePrice.toFixed(2) : "",
          asset.purchaseDate || "",
          asset.incomplete ? "Incomplete" : "Complete"
        ]);
      });
    });

    // Convert to CSV string
    const csvContent = rows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Create filename from address (sanitize for file system)
    const sanitizedAddress = register.address
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 100);
    const filename = `${sanitizedAddress}_asset_register.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [registers, editingIndex]);

  const handleCSVImport = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    fileInputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const file = e.target.files?.[0];
    if (!file || editingIndex === null) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedAssets = parseCSVForImport(text);

      if (parsedAssets.length > 0) {
        importWizard.actions.openWizard(parsedAssets);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [editingIndex, importWizard.actions]);

  const createImportGroup = useCallback(async () => {
    if (editingIndex === null) return;

    const register = registers[editingIndex];
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const groupName = `imported ${timestamp}`;

    // Create new asset group
    const groupId = crypto.randomUUID();
    const newRoom: Room = {
      id: groupId,
      name: groupName,
      tool: "rectangle",
      color: "#8b5cf6",
      assets: [],
    };

    // Add to local state
    const updatedRegisters = [...registers];
    updatedRegisters[editingIndex].rooms.push(newRoom);
    setRegisters(updatedRegisters);

    // Sync to API
    if (register.id) {
      try {
        await apiService.createAssetGroup({
          registerId: register.id,
          id: groupId,
          name: groupName,
          tool: "rectangle",
          color: "#8b5cf6",
        });

        // Prepare all assets for batch creation
        const assetsToCreate = importWizard.state.importedAssets.map((asset, index) => {
          const assetId = crypto.randomUUID();
          return {
            id: assetId,
            assetId: asset.assetId || undefined,
            itemType: asset.itemType || "",
            name: asset.name,
            serialNumber: asset.serialNumber || "",
            purchasePrice: asset.purchasePrice ?? 0,
            purchaseDate: asset.purchaseDate || "",
            incomplete: asset.incomplete,
            depnMethodAcc: asset.depnMethodAcc || undefined,
            depnRateAcc: asset.depnRateAcc || undefined,
            depnMethodTax: asset.depnMethodTax || undefined,
            depnRateTax: asset.depnRateTax || undefined,
          } as Asset;
        });

        // Add all assets to local state first
        updatedRegisters[editingIndex].rooms[updatedRegisters[editingIndex].rooms.length - 1].assets.push(...assetsToCreate);
        setRegisters([...updatedRegisters]);

        // Create assets in parallel using Promise.all
        await Promise.all(
          assetsToCreate.map((newAsset) =>
            apiService.createAsset({
              assetGroupId: groupId,
              id: newAsset.id,
              assetId: newAsset.assetId,
              itemType: newAsset.itemType,
              name: newAsset.name,
              serialNumber: newAsset.serialNumber,
              purchasePrice: newAsset.purchasePrice,
              purchaseDate: newAsset.purchaseDate,
              incomplete: newAsset.incomplete,
              depnMethodAcc: newAsset.depnMethodAcc,
              depnRateAcc: newAsset.depnRateAcc,
              depnMethodTax: newAsset.depnMethodTax,
              depnRateTax: newAsset.depnRateTax,
            })
          )
        );
        
        showSuccess(`Successfully imported ${assetsToCreate.length} asset${assetsToCreate.length !== 1 ? 's' : ''}`);
      } catch (err) {
        console.error("Failed to create import group:", err);
        const message = err instanceof ApiError 
          ? `Import failed: ${err.message}` 
          : "Failed to import assets. Please try again.";
        showError(message);
      }
    }

    // Close wizard
    importWizard.actions.closeWizard();
  }, [registers, editingIndex, setRegisters, importWizard, showError, showSuccess]);

  const handleImportNext = useCallback(async () => {
    if (!importWizard.isLastAsset) {
      importWizard.actions.nextAsset();
    } else {
      // All assets reviewed, create the import group
      await createImportGroup();
    }
  }, [importWizard, createImportGroup]);

  const handleImportSkip = useCallback(async () => {
    if (!importWizard.isLastAsset) {
      importWizard.actions.nextAsset();
    } else {
      // All assets reviewed, create the import group
      await createImportGroup();
    }
  }, [importWizard, createImportGroup]);

  const handleImportEdit = useCallback((editedAsset: Partial<Asset>) => {
    importWizard.actions.updateCurrentAsset(editedAsset);
  }, [importWizard.actions]);

  const closeImportWizard = useCallback(() => {
    importWizard.actions.closeWizard();
  }, [importWizard.actions]);

  return {
    handleExportCSV,
    handleCSVImport,
    createImportGroup,
    handleImportNext,
    handleImportSkip,
    handleImportEdit,
    closeImportWizard,
  };
}
