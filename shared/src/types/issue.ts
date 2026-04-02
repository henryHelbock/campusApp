export type IssueCategory = 'Building' | 'Social' | 'Road' | 'Water' | 'Debris' | 'Fight';

export type IssueSeverity = 'Mild' | 'Medium' | 'Large' | 'Severe';

export type IssueStatus = 'active' | 'fixed' | 'archived';

export interface Issue {
  id: number;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  status: IssueStatus;
  reporterId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueRequest {
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  latitude: number;
  longitude: number;
}

export interface IssueFilters {
  category?: IssueCategory;
  severity?: IssueSeverity;
  status?: IssueStatus;
  startDate?: string;
  endDate?: string;
}
