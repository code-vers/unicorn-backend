export interface IFeaturePayload {
  name: string;
  description?: string;
  iconUrl?: string;
  charge?: number;
  isAddon?: boolean;
}

export type IFeatureUpdatePayload = Partial<IFeaturePayload>;

export interface IFeatureQuery {
  searchTerm?: string;
  isAddon?: string | boolean;
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
