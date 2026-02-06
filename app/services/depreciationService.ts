/**
 * Depreciation calculation service
 */

export interface DepreciableAsset {
	assetId?: string;
	itemType?: string;
	name: string;
	purchasePrice: number;
	purchaseDate?: string;
	parentPurchasePrice?: number;
	parentAssetId?: string | null;
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

const revaluationTypes = new Set(["Revaluation", "Impairment", "Improvement"]);

function getFyTagForDate(dateString?: string): string | null {
	if (!dateString) return null;
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return null;
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	const endYear = month >= 4 ? year + 1 : year;
	return `fy${String(endYear).slice(-2)}`;
}

function isFirstMonthOfFy(dateString?: string): boolean {
	if (!dateString) return false;
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return false;
	return date.getMonth() + 1 === 4;
}

function parseIsoDate(dateString?: string): Date | null {
	if (!dateString) return null;
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return null;
	return date;
}

function getEventDate(version: DepreciableAsset & { parentAssetId?: string | null; exemptionType?: string }): Date | null {
	const isAcquisition =
		version.exemptionType === "Acquisition" ||
		(!version.exemptionType && (version as any).version === 1) ||
		!(version as any).parentAssetId;
	return parseIsoDate(isAcquisition ? version.purchaseDate : version.effectiveFrom);
}

function getFyBounds(financialYear: string): { start: Date; end: Date } {
	const endYear = Number(financialYear);
	const startYear = endYear - 1;
	return {
		start: new Date(startYear, 3, 1),
		end: new Date(endYear, 2, 31),
	};
}

function getFyMonthIndex(date: Date, financialYear: string): number | null {
	const { start, end } = getFyBounds(financialYear);
	if (date < start || date > end) return null;
	const month = date.getMonth(); // 0-11
	// FY month index: Apr(0) => 1, ... Mar(11) => 12
	const fyIndex = ((month + 9) % 12) + 1;
	return fyIndex;
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
	const revalnMonth =
		asset.exemptionType &&
		["Revaluation", "Impairment", "Improvement"].includes(asset.exemptionType) &&
		asset.effectiveFrom
			? calculateFinancialPeriod(asset.effectiveFrom).month
			: null;
	const basePurchasePrice =
		revalnMonth !== null && asset.parentPurchasePrice !== undefined && asset.parentPurchasePrice !== null
			? asset.parentPurchasePrice
			: purchasePrice;
	const revalnAmount = revalnMonth !== null ? purchasePrice - basePurchasePrice : 0;

	// Calculate month-by-month depreciation for the financial year
	const months: MonthlyDepreciation[] = [];
	let openingValue = 0;
	let totalDepn = 0;
	let totalAdditions = 0;
	let totalDisposals = 0;
	let totalRevals = 0;

	for (let month = 1; month <= 12; month++) {
		let acquisitions = 0;
		let disposals = 0;
		let revalns = 0;

		// For the acquisition month, opening value is $0 and acquisitions is the purchase price
		if (month === acquisitionMonth) {
			openingValue = 0;
			acquisitions = basePurchasePrice;
			totalAdditions += acquisitions;
		}
		if (revalnMonth !== null && month === revalnMonth) {
			revalns = revalnAmount;
		}

		// Calculate depreciation on the book value (opening + acquisitions)
		const bookValue = openingValue + acquisitions + revalns;
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
				monthDepn = basePurchasePrice;
			}
		} else if (isStraightLine) {
			// Straight-line: same amount each month based on original cost
			const slBasePrice = revalnMonth !== null && month < revalnMonth ? basePurchasePrice : purchasePrice;
			monthDepn = calculateMonthlyDepreciationSL(slBasePrice, bookValue, rate);
		} else {
			// Diminishing value: based on current book value
			monthDepn = calculateMonthlyDepreciationDV(bookValue, rate);
		}

		const closingValue = Math.max(0, bookValue - monthDepn + disposals);

		months.push({
			month,
			openingValue,
			revalns,
			acquisitions,
			disposals,
			depn: monthDepn,
			closingValue,
		});

		totalDepn += monthDepn;
		totalDisposals += disposals;
		totalRevals += revalns;
		openingValue = closingValue;
	}

	return {
		assetId: asset.assetId || "",
		name: asset.name,
		purchasePrice,
		months,
		open: 0,
		totalRevals,
		totalAdditions,
		totalDisposals,
		totalDepn,
		close: openingValue,
		calcType: type === "working" ? "accounting" : "tax",
	};
}

export function calculateDepreciationScheduleFromHistory(
	versions: (DepreciableAsset & { parentAssetId?: string | null; version?: number; exemptionType?: string })[],
	type: "working" | "register",
	financialYear: string
): DepreciationSchedule {
	const sorted = [...versions].sort((a, b) => (a.version || 0) - (b.version || 0));
	const latestIndex = sorted.length - 1;

	const currentFyTag = `fy${String(financialYear).slice(-2)}`;
	const taggedIndex = sorted
		.map((version, index) => {
			const isLatestVersion = index === latestIndex;
			const isAcquisition =
				version.exemptionType === "Acquisition" ||
				(!version.exemptionType && ((version as any).version === 1 || !version.parentAssetId));
			if (isAcquisition) {
				return getFyTagForDate(version.purchaseDate || version.effectiveFrom || undefined) === currentFyTag
					? index
					: -1;
			}
			if (isLatestVersion && version.exemptionType && isFirstMonthOfFy(version.effectiveFrom)) {
				return getFyTagForDate(version.effectiveFrom || undefined) === currentFyTag ? index : -1;
			}
			return -1;
		})
		.filter((i) => i !== -1)
		.pop();

	const { start: fyStart, end: fyEnd } = getFyBounds(financialYear);

	const effectiveSorted = sorted
		.map((version, index) => {
			const eventDate = getEventDate(version);
			if (!eventDate) return null;
			return { version, eventDate, index };
		})
		.filter((event): event is { version: DepreciableAsset & { parentAssetId?: string | null; version?: number; exemptionType?: string }; eventDate: Date; index: number } => Boolean(event))
		.sort((a, b) => {
			const diff = a.eventDate.getTime() - b.eventDate.getTime();
			if (diff !== 0) return diff;
			return (a.version.version || 0) - (b.version.version || 0);
		});

	let depreciationPaused = false;
	for (const event of effectiveSorted) {
		if (event.eventDate >= fyStart) break;
		if (event.version.exemptionType === "Marked unavailable for use") {
			depreciationPaused = true;
		} else if (event.version.exemptionType === "Marked available for use") {
			depreciationPaused = false;
		}
	}

	let checkpointIndex = taggedIndex ?? -1;
	if (checkpointIndex === -1) {
		// Fallback: latest version effective before FY start
		let latestBefore = -1;
		let latestBeforeDate: Date | null = null;
		sorted.forEach((version, index) => {
			const eventDate = getEventDate(version);
			if (!eventDate || eventDate > fyStart) return;
			if (!latestBeforeDate || eventDate > latestBeforeDate) {
				latestBeforeDate = eventDate;
				latestBefore = index;
			}
		});
		checkpointIndex = latestBefore !== -1 ? latestBefore : 0;
	}

	const checkpoint = sorted[checkpointIndex];
	const checkpointDate = getEventDate(checkpoint);
	const checkpointInFy = checkpointDate ? checkpointDate >= fyStart && checkpointDate <= fyEnd : false;
	const checkpointIsAcquisition =
		checkpoint.exemptionType === "Acquisition" ||
		(!checkpoint.exemptionType && ((checkpoint as any).version === 1 || !checkpoint.parentAssetId));
	const checkpointIsAprilExemption =
		!checkpointIsAcquisition &&
		Boolean(checkpoint.exemptionType) &&
		checkpointIndex === latestIndex &&
		isFirstMonthOfFy(checkpoint.effectiveFrom) &&
		getFyTagForDate(checkpoint.effectiveFrom || undefined) === currentFyTag;
	const useCheckpointAsOpening = !checkpointInFy || checkpointIsAprilExemption;

	if (useCheckpointAsOpening) {
		if (checkpoint.exemptionType === "Marked unavailable for use") {
			depreciationPaused = true;
		} else if (checkpoint.exemptionType === "Marked available for use") {
			depreciationPaused = false;
		}
	}

	const baseValue = checkpoint?.purchasePrice || 0;
	const baseMethod = type === "working" ? checkpoint.depnMethodAcc : checkpoint.depnMethodTax;
	const baseRate = type === "working" ? checkpoint.depnRateAcc : checkpoint.depnRateTax;
	let currentMethod = baseMethod || "SL";
	let currentRate = baseRate || "";

	let currentValue = useCheckpointAsOpening ? baseValue : 0;
	let slBaseCost = useCheckpointAsOpening ? baseValue : 0;

	const events = sorted
		.map((version, index) => {
			const eventDate = getEventDate(version);
			if (!eventDate) return null;
			return {
				index,
				version,
				eventDate,
			};
		})
		.filter((event): event is { index: number; version: DepreciableAsset & { parentAssetId?: string | null; version?: number; exemptionType?: string }; eventDate: Date } => Boolean(event))
		.filter((event) => event.eventDate >= fyStart && event.eventDate <= fyEnd)
		.filter((event) => (useCheckpointAsOpening ? event.index !== checkpointIndex : true))
		.sort((a, b) => {
			const diff = a.eventDate.getTime() - b.eventDate.getTime();
			if (diff !== 0) return diff;
			return (a.version.version || 0) - (b.version.version || 0);
		});

	if (!useCheckpointAsOpening && checkpointDate && !events.some((event) => event.index === checkpointIndex)) {
		events.unshift({ index: checkpointIndex, version: checkpoint, eventDate: checkpointDate });
	}

	const purchasePrice = baseValue;
	const months: MonthlyDepreciation[] = [];
	let openingValue = currentValue;
	let totalDepn = 0;
	let totalAdditions = 0;
	let totalDisposals = 0;
	let totalRevals = 0;

	for (let month = 1; month <= 12; month++) {
		let acquisitions = 0;
		let disposals = 0;
		let revalns = 0;
		let disposalThisMonth = false;

		const monthEvents = events.filter((event) => getFyMonthIndex(event.eventDate, financialYear) === month);
		for (const event of monthEvents) {
			const version = event.version;
			const isAcquisition =
				version.exemptionType === "Acquisition" ||
				(!version.exemptionType && ((version as any).version === 1 || !version.parentAssetId));
			if (isAcquisition) {
				const value = version.purchasePrice || 0;
				acquisitions += value;
				currentValue += value;
				slBaseCost += value;
				continue;
			}
			if (version.exemptionType === "Marked unavailable for use") {
				depreciationPaused = true;
				continue;
			}
			if (version.exemptionType === "Marked available for use") {
				depreciationPaused = false;
				continue;
			}
			if (version.exemptionType === "Change depn method") {
				if (type === "working") {
					if (version.depnMethodAcc) currentMethod = version.depnMethodAcc;
					if (version.depnRateAcc !== undefined) currentRate = version.depnRateAcc;
				} else {
					if (version.depnMethodTax) currentMethod = version.depnMethodTax;
					if (version.depnRateTax !== undefined) currentRate = version.depnRateTax;
				}
				continue;
			}
			if (version.exemptionType === "Disposal") {
				disposals += -currentValue;
				currentValue = 0;
				disposalThisMonth = true;
				continue;
			}
			if (version.exemptionType && revaluationTypes.has(version.exemptionType)) {
				const newValue = version.purchasePrice || 0;
				const delta = newValue - currentValue;
				revalns += delta;
				currentValue = newValue;
				slBaseCost = newValue;
			}
		}

		const bookValue = openingValue + acquisitions + revalns;
		const rate = currentRate ? parseRate(String(currentRate)) : 0;
		const method = currentMethod ? currentMethod.toLowerCase() : "sl";
		const isNonDepreciable = method === "nd" || method.includes("non-dep");
		const isLowValue = method === "lv" || method.includes("low-value");
		const isStraightLine = method === "sl" || method.includes("straight");
		let monthDepn = 0;
		if (disposalThisMonth || depreciationPaused) {
			monthDepn = 0;
		} else if (isNonDepreciable) {
			monthDepn = 0;
		} else if (isLowValue) {
			if (acquisitions > 0) {
				monthDepn = acquisitions;
			}
		} else if (isStraightLine) {
			monthDepn = calculateMonthlyDepreciationSL(slBaseCost, bookValue, rate);
		} else {
			monthDepn = calculateMonthlyDepreciationDV(bookValue, rate);
		}

		const closingValue = Math.max(0, bookValue + disposals - monthDepn);

		months.push({
			month,
			openingValue,
			revalns,
			acquisitions,
			disposals,
			depn: monthDepn,
			closingValue,
		});

		totalDepn += monthDepn;
		totalDisposals += disposals;
		totalAdditions += acquisitions;
		totalRevals += revalns;
		openingValue = closingValue;
		currentValue = closingValue;
	}

	const name = sorted[latestIndex]?.name || "";
	const assetId = sorted[latestIndex]?.assetId || "";

	return {
		assetId,
		name,
		purchasePrice,
		months,
		open: months[0]?.openingValue || 0,
		totalRevals,
		totalAdditions,
		totalDisposals,
		totalDepn,
		close: months[months.length - 1]?.closingValue || 0,
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
