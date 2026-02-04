/**
 * Custom hook for managing import wizard state
 */
import { useState, useCallback } from "react";
import type { Asset } from "~/types";

export interface ImportWizardState {
	isOpen: boolean;
	importedAssets: Asset[];
	currentIndex: number;
}

const initialState: ImportWizardState = {
	isOpen: false,
	importedAssets: [],
	currentIndex: 0,
};

export function useImportWizard() {
	const [state, setState] = useState<ImportWizardState>(initialState);

	const openWizard = useCallback((assets: Asset[]) => {
		setState({
			isOpen: true,
			importedAssets: assets,
			currentIndex: 0,
		});
	}, []);

	const closeWizard = useCallback(() => {
		setState(initialState);
	}, []);

	const nextAsset = useCallback(() => {
		setState(prev => ({
			...prev,
			currentIndex: Math.min(prev.currentIndex + 1, prev.importedAssets.length - 1),
		}));
	}, []);

	const previousAsset = useCallback(() => {
		setState(prev => ({
			...prev,
			currentIndex: Math.max(prev.currentIndex - 1, 0),
		}));
	}, []);

	const updateCurrentAsset = useCallback((updates: Partial<Asset>) => {
		setState(prev => ({
			...prev,
			importedAssets: prev.importedAssets.map((asset, idx) =>
				idx === prev.currentIndex ? { ...asset, ...updates } : asset
			),
		}));
	}, []);

	const removeCurrentAsset = useCallback(() => {
		setState(prev => {
			const newAssets = prev.importedAssets.filter((_, idx) => idx !== prev.currentIndex);
			const newIndex = Math.min(prev.currentIndex, newAssets.length - 1);
			return {
				...prev,
				importedAssets: newAssets,
				currentIndex: Math.max(0, newIndex),
				isOpen: newAssets.length > 0,
			};
		});
	}, []);

	const currentAsset = state.importedAssets[state.currentIndex];
	const isFirstAsset = state.currentIndex === 0;
	const isLastAsset = state.currentIndex === state.importedAssets.length - 1;
	const totalAssets = state.importedAssets.length;
	const hasAssets = totalAssets > 0;

	return {
		state,
		actions: {
			openWizard,
			closeWizard,
			nextAsset,
			previousAsset,
			updateCurrentAsset,
			removeCurrentAsset,
		},
		currentAsset,
		isFirstAsset,
		isLastAsset,
		totalAssets,
		hasAssets,
	};
}

export type UseImportWizard = ReturnType<typeof useImportWizard>;
