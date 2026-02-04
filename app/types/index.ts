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
  assetId: string;
  assetCategory: string;
  assetDescription: string;
  recordDate: string;
  effectiveDate: string;
  financialMonth: number;
  financialYear: number;
}

export type WizardStep = "question" | "addItem";
export type OwnershipWizardStep = "questions" | "values";