# Datamodeller & Schemakontrakt (doc/SCHEMA_CONTRACTS.md)

Detta dokument definierar de centrala datakontrakten och typerna mellan domäner och tjänster.

## 1. ExampleItem Schema
```typescript
export interface ExampleItem {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}
```

## 2. API / RPC Kontrakt
```typescript
export interface ExampleApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```
