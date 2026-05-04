export type DateFilter = 'All' | 'Today' | '7 days' | '30 days';
export const DATE_FILTER_OPTIONS: DateFilter[] = ['All', 'Today', '7 days', '30 days'];

const DATE_FILTER_MS: Record<Exclude<DateFilter, 'All'>, number> = {
    'Today': 86400000,
    '7 days': 604800000,
    '30 days': 2592000000,
};

export function dateFilterToStartDate(filter: DateFilter): string | undefined {
    if (filter === 'All') return undefined;
    return new Date(Date.now() - DATE_FILTER_MS[filter]).toISOString();
}

export function isWithinDateFilter(dateStr: string, filter: DateFilter): boolean {
    if (filter === 'All') return true;
    return Date.now() - new Date(dateStr).getTime() < DATE_FILTER_MS[filter];
}