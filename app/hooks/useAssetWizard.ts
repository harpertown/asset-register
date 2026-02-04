/**
 * Custom hook for managing asset wizard state and handlers
 */
import { useState, useRef, useCallback } from "react";
import type { WizardStep } from "~/types";
import { IRD_ASSET_TYPES } from "~/constants";

export interface AssetWizardState {
	// Which room the wizard is for
	roomId: string | null;
	// Current step in wizard
	step: WizardStep;
	// Asset being edited (null for new)
	editingAssetId: string | null;
	// Form fields
	itemType: string;
	name: string;
	assetId: string;
	serialNumber: string;
	purchasePrice: string;
	purchaseDate: string;
	photo: string | null;
	// Autocomplete
	itemTypeSuggestions: string[];
	showItemTypeSuggestions: boolean;
}

const initialState: AssetWizardState = {
	roomId: null,
	step: "question",
	editingAssetId: null,
	itemType: "",
	name: "",
	assetId: "",
	serialNumber: "",
	purchasePrice: "",
	purchaseDate: "",
	photo: null,
	itemTypeSuggestions: [],
	showItemTypeSuggestions: false,
};

export function useAssetWizard() {
	const [state, setState] = useState<AssetWizardState>(initialState);
	const itemTypeInputRef = useRef<HTMLInputElement>(null);
	const itemTypeSuggestionsRef = useRef<HTMLUListElement>(null);

	const openWizard = useCallback((roomId: string, editingId?: string | null) => {
		setState({
			...initialState,
			roomId,
			editingAssetId: editingId || null,
		});
	}, []);

	const closeWizard = useCallback(() => {
		setState(initialState);
	}, []);

	const setStep = useCallback((step: WizardStep) => {
		setState(prev => ({ ...prev, step }));
	}, []);

	const setItemType = useCallback((value: string) => {
		setState(prev => {
			if (value.length >= 1) {
				const filtered = IRD_ASSET_TYPES.filter((type) =>
					type.toLowerCase().includes(value.toLowerCase())
				);
				return {
					...prev,
					itemType: value,
					itemTypeSuggestions: filtered,
					showItemTypeSuggestions: filtered.length > 0,
				};
			}
			return {
				...prev,
				itemType: value,
				itemTypeSuggestions: [],
				showItemTypeSuggestions: false,
			};
		});
	}, []);

	const selectItemTypeSuggestion = useCallback((suggestion: string) => {
		setState(prev => ({
			...prev,
			itemType: suggestion,
			itemTypeSuggestions: [],
			showItemTypeSuggestions: false,
		}));
	}, []);

	const hideItemTypeSuggestions = useCallback(() => {
		setState(prev => ({ ...prev, showItemTypeSuggestions: false }));
	}, []);

	const setField = useCallback(<K extends keyof AssetWizardState>(
		field: K,
		value: AssetWizardState[K]
	) => {
		setState(prev => ({ ...prev, [field]: value }));
	}, []);

	const populateForEdit = useCallback((asset: {
		id: string;
		itemType: string;
		name: string;
		assetId?: string;
		serialNumber: string;
		purchasePrice: number;
		purchaseDate: string;
		photo?: string;
	}) => {
		setState(prev => ({
			...prev,
			step: "addItem",
			editingAssetId: asset.id,
			itemType: asset.itemType || "",
			name: asset.name || "",
			assetId: asset.assetId || "",
			serialNumber: asset.serialNumber || "",
			purchasePrice: asset.purchasePrice?.toString() || "",
			purchaseDate: asset.purchaseDate || "",
			photo: asset.photo || null,
		}));
	}, []);

	return {
		state,
		refs: {
			itemTypeInputRef,
			itemTypeSuggestionsRef,
		},
		actions: {
			openWizard,
			closeWizard,
			setStep,
			setItemType,
			selectItemTypeSuggestion,
			hideItemTypeSuggestions,
			setField,
			populateForEdit,
		},
		// Convenience getters for common checks
		isOpen: state.roomId !== null,
		isEditing: state.editingAssetId !== null,
	};
}

export type UseAssetWizard = ReturnType<typeof useAssetWizard>;
