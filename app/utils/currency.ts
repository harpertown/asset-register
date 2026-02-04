/**
 * Currency formatting utilities
 */

/**
 * Format a number as NZD currency
 * Returns "-" for zero values
 */
export function formatCurrency(amount: number): string {
	if (amount === 0) {
		return "-";
	}
	return new Intl.NumberFormat("en-NZ", {
		style: "currency",
		currency: "NZD",
	}).format(amount);
}

/**
 * Minimum width style for currency cells to fit "$00,000,000.00"
 */
export const currencyCellStyle = { minWidth: '90px' };
