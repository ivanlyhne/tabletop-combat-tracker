export interface MapConfig {
  id: string;
  campaignId: string;
  name: string;
  backgroundImageUrl?: string;
  widthCells: number;
  heightCells: number;
  cellSizePx: number;
  cellSizeFt: number;
  gridType: 'SQUARE' | 'HEX';
  gridColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapRequest {
  name: string;
  widthCells?: number;
  heightCells?: number;
  cellSizePx?: number;
  cellSizeFt?: number;
  gridType?: 'SQUARE' | 'HEX';
  gridColor?: string;
}

export interface AnnotationConfig {
  id: string;
  encounterId: string;
  annotationType: 'MARKER' | 'AREA' | 'TEXT';
  label?: string;
  position: AnnotationPosition;
  color: string;
  createdAt: string;
}

export interface AnnotationPosition {
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
}

export interface AnnotationRequest {
  annotationType: 'MARKER' | 'AREA' | 'TEXT';
  label?: string;
  position: AnnotationPosition;
  color?: string;
}
