/**
 * Custom hook for managing ownership wizard state
 */
import { useState, useCallback } from "react";
import type { OwnershipWizardStep } from "~/types";

export interface OwnershipWizardState {
	isOpen: boolean;
	step: OwnershipWizardStep;
	ownsLand: boolean | null;
	ownsBuildings: boolean | null;
	landValue: string;
	landPurchaseDate: string;
	buildingsValue: string;
	buildingsPurchaseDate: string;
}

const initialState: OwnershipWizardState = {
	isOpen: false,
	step: "questions",
	ownsLand: null,
	ownsBuildings: null,
	landValue: "",
	landPurchaseDate: "",
	buildingsValue: "",
	buildingsPurchaseDate: "",
};

export function useOwnershipWizard() {
	const [state, setState] = useState<OwnershipWizardState>(initialState);

	const openWizard = useCallback(() => {
		setState({ ...initialState, isOpen: true });
	}, []);

	const closeWizard = useCallback(() => {
		setState(initialState);
	}, []);

	const setStep = useCallback((step: OwnershipWizardStep) => {
		setState(prev => ({ ...prev, step }));
	}, []);

	const setOwnsLand = useCallback((value: boolean | null) => {
		setState(prev => ({ ...prev, ownsLand: value }));
	}, []);

	const setOwnsBuildings = useCallback((value: boolean | null) => {
		setState(prev => ({ ...prev, ownsBuildings: value }));
	}, []);

	const setLandValue = useCallback((value: string) => {
		setState(prev => ({ ...prev, landValue: value }));
	}, []);

	const setLandPurchaseDate = useCallback((value: string) => {
		setState(prev => ({ ...prev, landPurchaseDate: value }));
	}, []);

	const setBuildingsValue = useCallback((value: string) => {
		setState(prev => ({ ...prev, buildingsValue: value }));
	}, []);

	const setBuildingsPurchaseDate = useCallback((value: string) => {
		setState(prev => ({ ...prev, buildingsPurchaseDate: value }));
	}, []);

	const canProceedToValues = state.ownsLand !== null && state.ownsBuildings !== null;
	const needsLandValue = state.ownsLand === true;
	const needsBuildingsValue = state.ownsBuildings === true;

	return {
		state,
		actions: {
			openWizard,
			closeWizard,
			setStep,
			setOwnsLand,
			setOwnsBuildings,
			setLandValue,
			setLandPurchaseDate,
			setBuildingsValue,
			setBuildingsPurchaseDate,
		},
		canProceedToValues,
		needsLandValue,
		needsBuildingsValue,
	};
}

export type UseOwnershipWizard = ReturnType<typeof useOwnershipWizard>;
