import type { ParsedQs } from 'qs';
import { ValidationError } from '../services/errors';
import type { IssueFilters, IssueCategory, IssueSeverity, IssueStatus } from '@campusapp/shared';

export function parseIssueFilters(q: ParsedQs): IssueFilters {
    for (const key of ['category', 'severity', 'status', 'startDate', 'endDate']) {
        if (Array.isArray(q[key])) throw new ValidationError(`Invalid ${key}: expected a single value`);
    }
    return {
        category:  typeof q.category  === 'string' && q.category  !== '' ? q.category  as IssueCategory  : undefined,
        severity:  typeof q.severity  === 'string' && q.severity  !== '' ? q.severity  as IssueSeverity  : undefined,
        status:    typeof q.status    === 'string' && q.status    !== '' ? q.status    as IssueStatus    : undefined,
        startDate: typeof q.startDate === 'string' && q.startDate !== '' ? q.startDate : undefined,
        endDate:   typeof q.endDate   === 'string' && q.endDate   !== '' ? q.endDate   : undefined,
    };
}