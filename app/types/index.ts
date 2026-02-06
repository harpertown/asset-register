export type Tool = "rectangle" | "circle" | "pen";
export type DrawingTool = "select" | "rectangle" | "circle" | "pen";

export interface Point {
  x: number;
  y: number;
}

export interface DrawingShape {
  tool: Tool;
  color: string;
  rect?: { x: number; y: number; width: number; height: number };
  circle?: { cx: number; cy: number; radius: number };
  path?: Point[];
}

export interface Asset {
  id: string;
  assetId?: string;
  itemType: string;
  name: string;
  serialNumber: string;
  purchasePrice: number;
  purchaseDate: string;
  photo?: string;
  incomplete?: boolean;
  // Depreciation fields
  depnMethodAcc?: string;
  depnRateAcc?: string;
  depnMethodTax?: string;
  depnRateTax?: string;
  // Versioning fields
  version?: number;
  versionId?: string;
  assetGuid?: string;
  parentAssetId?: string | null;
  parentPurchasePrice?: number;
  effectiveFrom?: string;
  exemptionType?: string;
  exemptionNote?: string;
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  tool: Tool;
  color: string;
  assets: Asset[];
  isWholeSite?: boolean;
  // For rectangle
  rect?: { x: number; y: number; width: number; height: number };
  // For circle
  circle?: { cx: number; cy: number; radius: number };
  // For freeform pen
  path?: Point[];
}

export interface Register {
  id?: string;
  address: string;
  sitePlan: string | null;
  rooms: Room[];
  ownsLand?: boolean;
  ownsBuildings?: boolean;
  wizardCompleted?: boolean;
  landValue?: string;
  landPurchaseDate?: string;
  buildingsValue?: string;
  buildingsPurchaseDate?: string;
}

export interface Transaction {
  id: string; // internal asset id for reference
  roomId: string; // for updating
  assetId: string;
  assetGuid?: string; // persistent asset identity
  versionId?: string; // version-specific id
  itemType?: string;
  assetCategory: string;
  assetDescription: string;
  recordDate: string;
  effectiveDate: string;
  purchaseDate: string; // raw ISO date for editing
  financialMonth: number;
  financialYear: number;
  purchasePrice: number;
  // Depreciation fields
  depnMethodAcc?: string;
  depnRateAcc?: string;
  depnMethodTax?: string;
  depnRateTax?: string;
  incomplete?: boolean;
}
}

export type WizardStep = "question" | "addItem";
export type OwnershipWizardStep = "questions" | "values";
