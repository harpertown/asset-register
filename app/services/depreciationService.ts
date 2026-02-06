/**
 * Depreciation calculation service
 */

export interface DepreciableAsset {
	assetId?: string;
	itemType?: string;
	name: string;
	purchasePrice: number;
	purchaseDate?: string;
	depnMethodAcc?: string;
	depnRateAcc?: string;
	depnMethodTax?: string;
	depnRateTax?: string;
	exemptionType?: string;
	effectiveFrom?: string;
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

export interface MonthlyDepreciation {
	month: number;
	openingValue: number;
	revalns: number;
	acquisitions: number;
	disposals: number;
	depn: number;
	closingValue: number;
}

export interface DepreciationSchedule {
	assetId: string;
	name: string;
	purchasePrice: number;
	months: MonthlyDepreciation[];
	open: number;
	totalRevals: number;
	totalAdditions: number;
	totalDisposals: number;
	totalDepn: number;
	close: number;
	calcType?: "accounting" | "tax";
}

export interface CategorySummary {
	category: string;
	openingBookValue: number;
	revaluations: number;
	additions: number;
	disposals: number;
	depreciation: number;
	closingBookValue: number;
	calcType: "accounting" | "tax";
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
	const methodLower = method.toLowerCase();
	
	// Non-depreciable
	if (methodLower === "nd" || methodLower.includes("non-dep")) {
		return 0;
	}

	// Low-value write-off: full depreciation immediately
	if (methodLower === "lv" || methodLower.includes("low-value")) {
		return price;
	}

	// Straight-line: (Cost × Rate) / 12 × months, capped at original price
	if (methodLower === "sl" || methodLower.includes("straight")) {
		const monthlyDepn = (price * rate) / 12;
		const totalDepn = monthlyDepn * months;
		return Math.min(totalDepn, price); // Can't depreciate more than the asset cost
	}

	// Diminishing value: compound monthly depreciation
	if (methodLower === "dv" || methodLower.includes("diminishing") || methodLower.includes("declining")) {
		let bookValue = price;
		let totalDepreciation = 0;
		const monthlyRate = rate / 12;

		for (let i = 0; i < months && bookValue > 0; i++) {
			const monthlyDepn = bookValue * monthlyRate;
			totalDepreciation += monthlyDepn;
			bookValue -= monthlyDepn;
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

/**
 * Calculate financial period from a date
 */
function calculateFinancialPeriod(dateString?: string): { month: number; year: string } {
	if (!dateString) return { month: 1, year: "" };
	const date = new Date(dateString);
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	// NZ financial year: April to March
	if (month >= 4) {
		return { month: month - 3, year: `${year}/${year + 1}` };
	}
	return { month: month + 9, year: `${year - 1}/${year}` };
}

/**
 * Calculate monthly depreciation for straight-line method
 * For SL: same amount each month = (Original Cost × Annual Rate) / 12
 * Depreciation stops when book value reaches 0
 */
function calculateMonthlyDepreciationSL(originalCost: number, currentBookValue: number, annualRate: number): number {
	if (currentBookValue <= 0) return 0;
	const monthlyDepn = (originalCost * annualRate) / 12;
	// Don't depreciate below 0
	return Math.min(monthlyDepn, currentBookValue);
}

/**
 * Calculate monthly depreciation for diminishing value method
 * For DV: depreciation is based on current book value = (Book Value × Annual Rate) / 12
 */
function calculateMonthlyDepreciationDV(currentBookValue: number, annualRate: number): number {
	if (currentBookValue <= 0) return 0;
	return (currentBookValue * annualRate) / 12;
}

/**
 * Calculate month-by-month depreciation schedule for an asset
 */
export function calculateDepreciationSchedule(
	asset: DepreciableAsset,
	type: "working" | "register"
): DepreciationSchedule {
	const purchasePrice = asset.purchasePrice || 0;

	// Get depreciation rate and method based on type
	const depnRate = type === "working" ? asset.depnRateAcc : asset.depnRateTax;
	const depnMethod = type === "working" ? asset.depnMethodAcc : asset.depnMethodTax;

	// Use 0% rate if no rate specified
	const rate = depnRate ? parseRate(depnRate) : 0;
	const method = depnMethod ? depnMethod.toLowerCase() : "sl";

	// Check for special methods
	const isNonDepreciable = method === "nd" || method.includes("non-dep");
	const isLowValue = method === "lv" || method.includes("low-value");
	const isStraightLine = method === "sl" || method.includes("straight");
	// Default to diminishing value if not straight-line

	// Calculate the financial month when the asset was acquired
	const acquisitionFinancialPeriod = calculateFinancialPeriod(asset.purchaseDate);
	const acquisitionMonth = acquisitionFinancialPeriod.month;
	const disposalMonth =
		asset.exemptionType === "Disposal" && asset.effectiveFrom
			? calculateFinancialPeriod(asset.effectiveFrom).month
			: null;

	// Calculate month-by-month depreciation for the financial year
	const months: MonthlyDepreciation[] = [];
	let openingValue = 0;
	let totalDepn = 0;
	let totalAdditions = 0;
	let totalDisposals = 0;

	for (let month = 1; month <= 12; month++) {
		let acquisitions = 0;
		let disposals = 0;

		// For the acquisition month, opening value is $0 and acquisitions is the purchase price
		if (month === acquisitionMonth) {
			openingValue = 0;
			acquisitions = purchasePrice;
			totalAdditions += acquisitions;
		}

		// Calculate depreciation on the book value (opening + acquisitions)
		const bookValue = openingValue + acquisitions;
		let monthDepn = 0;

		if (disposalMonth !== null && month === disposalMonth) {
			// Disposal effective from the start of the month.
			// Show disposals as negative and stop depreciation for this month.
			disposals = -bookValue;
			monthDepn = 0;
		} else if (isNonDepreciable) {
			monthDepn = 0;
		} else if (isLowValue) {
			// Low-value write-off: full depreciation in acquisition month
			if (month === acquisitionMonth) {
				monthDepn = purchasePrice;
			}
		} else if (isStraightLine) {
			// Straight-line: same amount each month based on original cost
			monthDepn = calculateMonthlyDepreciationSL(purchasePrice, bookValue, rate);
		} else {
			// Diminishing value: based on current book value
			monthDepn = calculateMonthlyDepreciationDV(bookValue, rate);
		}

		const closingValue = Math.max(0, bookValue - monthDepn + disposals);

		months.push({
			month,
			openingValue,
			revalns: 0,
			acquisitions,
			disposals,
			depn: monthDepn,
			closingValue,
		});

		totalDepn += monthDepn;
		totalDisposals += disposals;
		openingValue = closingValue;
	}

	return {
		assetId: asset.assetId || "",
		name: asset.name,
		purchasePrice,
		months,
		open: 0,
		totalRevals: 0,
		totalAdditions,
		totalDisposals,
		totalDepn,
		close: openingValue,
		calcType: type === "working" ? "accounting" : "tax",
	};
}

/**
 * Calculate category summary for FY Register view
 */
export function calculateCategorySummary(
	assets: DepreciableAsset[],
	categories: string[],
	type: "working" | "register"
): CategorySummary[] {
	const results: CategorySummary[] = [];

	for (const category of categories) {
		const categoryAssets = assets.filter(
			(asset) => (asset.itemType || "").toLowerCase() === category.toLowerCase()
		);

		let openingBookValue = 0;
		let revaluations = 0;
		let additions = 0;
		let disposals = 0;
		let depreciation = 0;
		let closingBookValue = 0;

		if (categoryAssets.length > 0) {
			const schedules = categoryAssets.map((asset) => calculateDepreciationSchedule(asset, type));

			openingBookValue = schedules.reduce((sum, s) => sum + s.open, 0);
			revaluations = schedules.reduce((sum, s) => sum + s.totalRevals, 0);
			additions = schedules.reduce((sum, s) => sum + s.totalAdditions, 0);
			disposals = schedules.reduce((sum, s) => sum + s.totalDisposals, 0);
			depreciation = schedules.reduce((sum, s) => sum + s.totalDepn, 0);
			closingBookValue = schedules.reduce((sum, s) => sum + s.close, 0);
		}

		results.push({
			category,
			openingBookValue,
			revaluations,
			additions,
			disposals,
			depreciation,
			closingBookValue,
			calcType: type === "working" ? "accounting" : "tax",
		});
	}

	return results;
}
