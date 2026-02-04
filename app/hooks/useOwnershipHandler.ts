import { useCallback } from "react";
import type { Register, Room, Asset } from "~/types";
import { apiService } from "~/services/api";
import type { UseOwnershipWizard } from "./useOwnershipWizard";

export interface UseOwnershipHandlerParams {
  registers: Register[];
  editingIndex: number | null;
  setRegisters: React.Dispatch<React.SetStateAction<Register[]>>;
  ownershipWizard: UseOwnershipWizard;
  setWizardActive: (active: boolean) => void;
}

export interface UseOwnershipHandlerReturn {
  handleOwnershipQuestionsNext: () => void;
  handleOwnershipWizardContinue: () => Promise<void>;
  handleOwnershipWizardSkip: () => Promise<void>;
  handleOwnershipValuesSkip: () => Promise<void>;
  startAssetRegisterWizard: () => void;
}

export function useOwnershipHandler({
  registers,
  editingIndex,
  setRegisters,
  ownershipWizard,
  setWizardActive,
}: UseOwnershipHandlerParams): UseOwnershipHandlerReturn {

  const startAssetRegisterWizard = useCallback(() => {
    ownershipWizard.actions.openWizard();
  }, [ownershipWizard.actions]);

  const handleOwnershipQuestionsNext = useCallback(() => {
    const { ownsLand, ownsBuildings } = ownershipWizard.state;
    if (ownsLand || ownsBuildings) {
      ownershipWizard.actions.setStep("values");
    } else {
      // Neither selected, skip to drawing
      if (editingIndex !== null) {
        const updatedRegisters = [...registers];
        updatedRegisters[editingIndex].wizardCompleted = true;
        setRegisters(updatedRegisters);
      }
      ownershipWizard.actions.closeWizard();
      setWizardActive(true);
    }
  }, [ownershipWizard.state, ownershipWizard.actions, editingIndex, registers, setRegisters, setWizardActive]);

  const handleOwnershipWizardContinue = useCallback(async () => {
    const { ownsLand, ownsBuildings, landValue, landPurchaseDate, buildingsValue, buildingsPurchaseDate } = ownershipWizard.state;
    if (editingIndex === null || (!ownsLand && !ownsBuildings)) {
      ownershipWizard.actions.closeWizard();
      setWizardActive(true);
      return;
    }

    const updatedRegisters = [...registers];
    const register = updatedRegisters[editingIndex];
    updatedRegisters[editingIndex].ownsLand = ownsLand || false;
    updatedRegisters[editingIndex].ownsBuildings = ownsBuildings || false;

    // Check if Whole Site entry already exists
    const existingWholeSite = updatedRegisters[editingIndex].rooms.find(r => r.isWholeSite);

    if (!existingWholeSite) {
      // Create a Whole Site entry
      const wholeSiteAssets: Asset[] = [];
      const wholeSiteRoomId = `whole-site-${Date.now()}`;

      if (ownsLand) {
        wholeSiteAssets.push({
          id: `land-${Date.now()}`,
          itemType: "Property",
          name: "Land",
          serialNumber: "",
          purchasePrice: parseFloat(landValue) || 0,
          purchaseDate: landPurchaseDate || "",
          incomplete: !landValue || parseFloat(landValue) === 0 || !landPurchaseDate,
        });
      }

      if (ownsBuildings) {
        wholeSiteAssets.push({
          id: `buildings-${Date.now() + 1}`,
          itemType: "Property",
          name: "Buildings",
          serialNumber: "",
          purchasePrice: parseFloat(buildingsValue) || 0,
          purchaseDate: buildingsPurchaseDate || "",
          incomplete: !buildingsValue || parseFloat(buildingsValue) === 0 || !buildingsPurchaseDate,
        });
      }

      const wholeSiteRoom: Room = {
        id: wholeSiteRoomId,
        name: "Whole Site",
        tool: "rectangle",
        color: "#6366f1",
        assets: wholeSiteAssets,
        isWholeSite: true,
      };

      updatedRegisters[editingIndex].rooms.unshift(wholeSiteRoom);

      // Sync to API
      if (register.id) {
        try {
          await apiService.createAssetGroup({
            registerId: register.id,
            id: wholeSiteRoomId,
            name: "Whole Site",
            tool: "rectangle",
            color: "#6366f1",
            isWholeSite: true,
          });

          for (const asset of wholeSiteAssets) {
            await apiService.createAsset({
              assetGroupId: wholeSiteRoomId,
              id: asset.id,
              itemType: asset.itemType,
              name: asset.name,
              serialNumber: asset.serialNumber,
              purchasePrice: asset.purchasePrice,
              purchaseDate: asset.purchaseDate,
              incomplete: asset.incomplete,
            });
          }
        } catch (err) {
          console.error("Failed to create whole site:", err);
        }
      }
    } else {
      // Update existing Whole Site entry
      const wholeSiteIndex = updatedRegisters[editingIndex].rooms.findIndex(r => r.isWholeSite);
      if (wholeSiteIndex !== -1) {
        const existingAssets = updatedRegisters[editingIndex].rooms[wholeSiteIndex].assets;
        const wholeSiteRoomId = updatedRegisters[editingIndex].rooms[wholeSiteIndex].id;

        // Handle Land asset
        await handleLandAsset(register, existingAssets, wholeSiteRoomId, ownsLand, landValue, landPurchaseDate);

        // Handle Buildings asset
        await handleBuildingsAsset(register, existingAssets, wholeSiteRoomId, ownsBuildings, buildingsValue, buildingsPurchaseDate);
      }
    }

    updatedRegisters[editingIndex].wizardCompleted = true;
    setRegisters(updatedRegisters);

    // Update register in API
    if (register.id) {
      try {
        await apiService.updateRegister({
          id: register.id,
          address: register.address,
          sitePlan: register.sitePlan,
          ownsLand: ownsLand || false,
          ownsBuildings: ownsBuildings || false,
          wizardCompleted: true,
        });
      } catch (err) {
        console.error("Failed to update register:", err);
      }
    }

    ownershipWizard.actions.closeWizard();
    setWizardActive(true);
  }, [ownershipWizard.state, ownershipWizard.actions, editingIndex, registers, setRegisters, setWizardActive]);

  const handleOwnershipWizardSkip = useCallback(async () => {
    if (editingIndex !== null) {
      const updatedRegisters = [...registers];
      updatedRegisters[editingIndex].wizardCompleted = true;
      setRegisters(updatedRegisters);

      const register = updatedRegisters[editingIndex];
      if (register.id) {
        try {
          await apiService.updateRegister({
            id: register.id,
            address: register.address,
            sitePlan: register.sitePlan,
            ownsLand: register.ownsLand,
            ownsBuildings: register.ownsBuildings,
            wizardCompleted: true,
          });
        } catch (err) {
          console.error("Failed to update register:", err);
        }
      }
    }
    ownershipWizard.actions.closeWizard();
    setWizardActive(true);
  }, [editingIndex, registers, setRegisters, ownershipWizard.actions, setWizardActive]);

  const handleOwnershipValuesSkip = useCallback(async () => {
    const { ownsLand, ownsBuildings } = ownershipWizard.state;
    if (editingIndex === null || (!ownsLand && !ownsBuildings)) {
      ownershipWizard.actions.closeWizard();
      setWizardActive(true);
      return;
    }

    const updatedRegisters = [...registers];
    const register = updatedRegisters[editingIndex];
    updatedRegisters[editingIndex].ownsLand = ownsLand || false;
    updatedRegisters[editingIndex].ownsBuildings = ownsBuildings || false;

    // Check if Whole Site entry already exists
    const existingWholeSite = updatedRegisters[editingIndex].rooms.find(r => r.isWholeSite);

    if (!existingWholeSite) {
      // Create a Whole Site entry with incomplete assets
      const wholeSiteAssets: Asset[] = [];
      const wholeSiteRoomId = `whole-site-${Date.now()}`;

      if (ownsLand) {
        wholeSiteAssets.push({
          id: `land-${Date.now()}`,
          itemType: "Property",
          name: "Land",
          serialNumber: "",
          purchasePrice: 0,
          purchaseDate: "",
          incomplete: true,
        });
      }

      if (ownsBuildings) {
        wholeSiteAssets.push({
          id: `buildings-${Date.now() + 1}`,
          itemType: "Property",
          name: "Buildings",
          serialNumber: "",
          purchasePrice: 0,
          purchaseDate: "",
          incomplete: true,
        });
      }

      const wholeSiteRoom: Room = {
        id: wholeSiteRoomId,
        name: "Whole Site",
        tool: "rectangle",
        color: "#6366f1",
        assets: wholeSiteAssets,
        isWholeSite: true,
      };

      updatedRegisters[editingIndex].rooms.unshift(wholeSiteRoom);

      // Sync to API
      if (register.id) {
        try {
          await apiService.createAssetGroup({
            registerId: register.id,
            id: wholeSiteRoomId,
            name: "Whole Site",
            tool: "rectangle",
            color: "#6366f1",
            isWholeSite: true,
          });

          for (const asset of wholeSiteAssets) {
            await apiService.createAsset({
              assetGroupId: wholeSiteRoomId,
              id: asset.id,
              itemType: asset.itemType,
              name: asset.name,
              serialNumber: asset.serialNumber,
              purchasePrice: asset.purchasePrice,
              purchaseDate: asset.purchaseDate,
              incomplete: asset.incomplete,
            });
          }
        } catch (err) {
          console.error("Failed to create whole site:", err);
        }
      }
    }

    updatedRegisters[editingIndex].wizardCompleted = true;
    setRegisters(updatedRegisters);

    // Update register in API
    if (register.id) {
      try {
        await apiService.updateRegister({
          id: register.id,
          address: register.address,
          sitePlan: register.sitePlan,
          ownsLand: ownsLand || false,
          ownsBuildings: ownsBuildings || false,
          wizardCompleted: true,
        });
      } catch (err) {
        console.error("Failed to update register:", err);
      }
    }

    ownershipWizard.actions.closeWizard();
    setWizardActive(true);
  }, [ownershipWizard.state, ownershipWizard.actions, editingIndex, registers, setRegisters, setWizardActive]);

  return {
    handleOwnershipQuestionsNext,
    handleOwnershipWizardContinue,
    handleOwnershipWizardSkip,
    handleOwnershipValuesSkip,
    startAssetRegisterWizard,
  };
}

// Helper functions to reduce code duplication
async function handleLandAsset(
  register: Register,
  existingAssets: Asset[],
  wholeSiteRoomId: string,
  ownsLand: boolean | null,
  landValue: string,
  landPurchaseDate: string
) {
  const landAssetIndex = existingAssets.findIndex(a => a.name === "Land");
  if (ownsLand) {
    const landAsset: Asset = {
      id: landAssetIndex !== -1 ? existingAssets[landAssetIndex].id : `land-${Date.now()}`,
      assetId: landAssetIndex !== -1 ? existingAssets[landAssetIndex].assetId : undefined,
      itemType: "Property",
      name: "Land",
      serialNumber: "",
      purchasePrice: parseFloat(landValue) || 0,
      purchaseDate: landPurchaseDate || "",
      incomplete: !landValue || parseFloat(landValue) === 0 || !landPurchaseDate,
    };

    if (landAssetIndex !== -1) {
      existingAssets[landAssetIndex] = landAsset;
    } else {
      existingAssets.push(landAsset);
    }

    if (register.id) {
      try {
        if (landAssetIndex !== -1) {
          await apiService.updateAsset({
            id: landAsset.id,
            assetId: landAsset.assetId,
            itemType: landAsset.itemType,
            name: landAsset.name,
            serialNumber: landAsset.serialNumber,
            purchasePrice: landAsset.purchasePrice,
            purchaseDate: landAsset.purchaseDate,
            incomplete: landAsset.incomplete,
          });
        } else {
          await apiService.createAsset({
            assetGroupId: wholeSiteRoomId,
            ...landAsset,
          });
        }
      } catch (err) {
        console.error("Failed to save land asset:", err);
      }
    }
  } else if (landAssetIndex !== -1) {
    const landAssetId = existingAssets[landAssetIndex].id;
    existingAssets.splice(landAssetIndex, 1);

    if (register.id) {
      try {
        await apiService.deleteAsset(landAssetId);
      } catch (err) {
        console.error("Failed to delete land asset:", err);
      }
    }
  }
}

async function handleBuildingsAsset(
  register: Register,
  existingAssets: Asset[],
  wholeSiteRoomId: string,
  ownsBuildings: boolean | null,
  buildingsValue: string,
  buildingsPurchaseDate: string
) {
  const buildingsAssetIndex = existingAssets.findIndex(a => a.name === "Buildings");
  if (ownsBuildings) {
    const buildingsAsset: Asset = {
      id: buildingsAssetIndex !== -1 ? existingAssets[buildingsAssetIndex].id : `buildings-${Date.now()}`,
      assetId: buildingsAssetIndex !== -1 ? existingAssets[buildingsAssetIndex].assetId : undefined,
      itemType: "Property",
      name: "Buildings",
      serialNumber: "",
      purchasePrice: parseFloat(buildingsValue) || 0,
      purchaseDate: buildingsPurchaseDate || "",
      incomplete: !buildingsValue || parseFloat(buildingsValue) === 0 || !buildingsPurchaseDate,
    };

    if (buildingsAssetIndex !== -1) {
      existingAssets[buildingsAssetIndex] = buildingsAsset;
    } else {
      existingAssets.push(buildingsAsset);
    }

    if (register.id) {
      try {
        if (buildingsAssetIndex !== -1) {
          await apiService.updateAsset({
            id: buildingsAsset.id,
            assetId: buildingsAsset.assetId,
            itemType: buildingsAsset.itemType,
            name: buildingsAsset.name,
            serialNumber: buildingsAsset.serialNumber,
            purchasePrice: buildingsAsset.purchasePrice,
            purchaseDate: buildingsAsset.purchaseDate,
            incomplete: buildingsAsset.incomplete,
          });
        } else {
          await apiService.createAsset({
            assetGroupId: wholeSiteRoomId,
            ...buildingsAsset,
          });
        }
      } catch (err) {
        console.error("Failed to save buildings asset:", err);
      }
    }
  } else if (buildingsAssetIndex !== -1) {
    const buildingsAssetId = existingAssets[buildingsAssetIndex].id;
    existingAssets.splice(buildingsAssetIndex, 1);

    if (register.id) {
      try {
        await apiService.deleteAsset(buildingsAssetId);
      } catch (err) {
        console.error("Failed to delete buildings asset:", err);
      }
    }
  }
}
