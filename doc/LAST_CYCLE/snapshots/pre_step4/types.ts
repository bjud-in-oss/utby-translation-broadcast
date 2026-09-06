export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExampleWidgetData extends BaseEntity {
  title: string;
  count: number;
}
