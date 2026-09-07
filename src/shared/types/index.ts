export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';
