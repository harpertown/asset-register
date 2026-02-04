/**
 * Date formatting and financial period utilities
 */

/**
 * Calculate the financial period (month and year) for a given date
 * NZ financial year runs April to March
 */
export function calculateFinancialPeriod(dateStr: string): { month: number; year: number } {
	if (!dateStr) return { month: 1, year: new Date().getFullYear() };
	const date = new Date(dateStr);
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	let financialMonth: number;
	let financialYear: number;
	if (month >= 4) {
		financialMonth = month - 3;
		financialYear = year + 1;
	} else {
		financialMonth = month + 9;
		financialYear = year;
	}
	return { month: financialMonth, year: financialYear };
}

/**
 * Format a date string to NZ locale format (e.g., "01 Jan 2024")
 */
export function formatDate(dateStr: string): string {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Parse various date formats to ISO date string (YYYY-MM-DD)
 */
export function parseDate(dateStr: string): string {
	if (!dateStr) return "";
	
	// Try ISO format first (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return dateStr;
	}
	
	// Try DD/MM/YYYY or MM/DD/YYYY format
	const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (slashMatch) {
		const [, first, second, year] = slashMatch;
		const firstNum = parseInt(first, 10);
		const secondNum = parseInt(second, 10);
		
		// Use heuristics to determine format:
		// If first number > 12, it must be day (DD/MM/YYYY)
		// If second number > 12, it must be day (MM/DD/YYYY)
		// Otherwise, assume DD/MM/YYYY (NZ format)
		let day: string, month: string;
		if (firstNum > 12) {
			// DD/MM/YYYY - first is definitely day
			day = first;
			month = second;
		} else if (secondNum > 12) {
			// MM/DD/YYYY - second is definitely day
			month = first;
			day = second;
		} else {
			// Ambiguous - default to DD/MM/YYYY (NZ format)
			day = first;
			month = second;
		}
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}
	
	// Try to parse with Date constructor as fallback
	const parsed = new Date(dateStr);
	if (!isNaN(parsed.getTime())) {
		return parsed.toISOString().split('T')[0];
	}
	
	return "";
}
