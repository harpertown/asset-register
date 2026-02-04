/**
 * Depreciation calculation service
 */

export interface DepreciableAsset {
	assetId?: string;
	name: string;
	purchasePrice: number;
	purchaseDate?: string;
	depnMethodAcc?: string;
	depnRateAcc?: string;
	depnMethodTax?: string;
	depnRateTax?: string;
}

export interface DepreciationResult {
	assetId: string;
	name: string;
	purchasePrice: number;
	accDepreciation: number;
	taxDepreciation: number;
	bookValueAcc: number;
	bookValueTax: number;
	monthsHeld: number;
}

/**
 * Parse depreciation rate string (e.g., "2%" -> 0.02)
 */
function parseRate(rate: string): number {
	if (!rate) return 0;
	const parsed = parseFloat(rate.replace("%", ""));
	return isNaN(parsed) ? 0 : parsed / 100;
}

/**
 * Calculate depreciation based on method
 */
function calculateByMethod(
	price: number, 
	rate: number, 
	method: string, 
	months: number
): number {
	if (!method || method.toLowerCase() === "non-depreciable") {
		return 0;
	}

	if (method.toLowerCase() === "low-value write-off") {
		return price; // Full write-off in first year
	}

	if (method.toLowerCase().includes("straight-line")) {
		// Straight-line: (Cost × Rate) / 12 × months
		return (price * rate * months) / 12;
	}

	if (method.toLowerCase().includes("diminishing")) {
		// Diminishing value: Book Value × Rate × (months / 12)
		let bookValue = price;
		let totalDepreciation = 0;
		const years = months / 12;

		for (let i = 0; i < years; i++) {
			const yearlyDepreciation = bookValue * rate;
			totalDepreciation += yearlyDepreciation;
			bookValue -= yearlyDepreciation;
		}

		// Add partial year depreciation
		const partialMonths = months % 12;
		if (partialMonths > 0) {
			totalDepreciation += bookValue * rate * (partialMonths / 12);
		}

		return totalDepreciation;
	}

	return 0;
}

/**
 * Calculate depreciation for an asset
 */
export function calculateDepreciation(
	asset: DepreciableAsset,
	_type: "working" | "register" = "working"
): DepreciationResult {
	const purchasePrice = asset.purchasePrice || 0;
	const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
	const depnMethodAcc = asset.depnMethodAcc || "";
	const depnRateAcc = asset.depnRateAcc || "";
	const depnMethodTax = asset.depnMethodTax || "";
	const depnRateTax = asset.depnRateTax || "";

	if (!purchaseDate) {
		return {
			assetId: asset.assetId || "",
			name: asset.name,
			purchasePrice,
			accDepreciation: 0,
			taxDepreciation: 0,
			bookValueAcc: purchasePrice,
			bookValueTax: purchasePrice,
			monthsHeld: 0,
		};
	}

	const now = new Date();
	const monthsHeld = Math.floor(
		(now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
	);

	const rateAcc = parseRate(depnRateAcc);
	const rateTax = parseRate(depnRateTax);

	const accDepreciation = calculateByMethod(purchasePrice, rateAcc, depnMethodAcc, monthsHeld);
	const taxDepreciation = calculateByMethod(purchasePrice, rateTax, depnMethodTax, monthsHeld);

	return {
		assetId: asset.assetId || "",
		name: asset.name,
		purchasePrice,
		accDepreciation,
		taxDepreciation,
		bookValueAcc: Math.max(0, purchasePrice - accDepreciation),
		bookValueTax: Math.max(0, purchasePrice - taxDepreciation),
		monthsHeld,
	};
}

/**
 * Calculate depreciation for multiple assets
 */
export function calculateDepreciationBatch(
	assets: DepreciableAsset[],
	type: "working" | "register" = "working"
): DepreciationResult[] {
	return assets.map(asset => calculateDepreciation(asset, type));
}

/**
 * Sum depreciation results
 */
export function sumDepreciationResults(results: DepreciationResult[]): {
	totalAccDepreciation: number;
	totalTaxDepreciation: number;
	totalBookValueAcc: number;
	totalBookValueTax: number;
} {
	return results.reduce(
		(acc, result) => ({
			totalAccDepreciation: acc.totalAccDepreciation + result.accDepreciation,
			totalTaxDepreciation: acc.totalTaxDepreciation + result.taxDepreciation,
			totalBookValueAcc: acc.totalBookValueAcc + result.bookValueAcc,
			totalBookValueTax: acc.totalBookValueTax + result.bookValueTax,
		}),
		{
			totalAccDepreciation: 0,
			totalTaxDepreciation: 0,
			totalBookValueAcc: 0,
			totalBookValueTax: 0,
		}
	);
}
