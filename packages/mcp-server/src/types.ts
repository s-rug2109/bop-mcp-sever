export interface DigitalTwinSearchRequest {
  query_type: 'topology' | 'children' | 'filter' | 'details';
  depth?: 'Space' | 'Equipment' | 'Point';
  point_id?: string | string[];
  entity_id?: string | string[];
  filters?: Record<string, any>;
}

export interface PointDataLatestRequest {
  point_id: string[];
}

export interface PointValue {
  point_id: string;
  value: number;
  timestamp: string;
  quality: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}