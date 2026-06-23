import { OrderTimelineEventType } from '../enums/order-timeline-event-type.enum';

export interface SerializedTimelineEvent {
  id: string;
  type: OrderTimelineEventType;
  payload: Record<string, unknown>;
  createdAt: string;
  createdBy?: { id: string; email: string };
}

export interface SerializedAdminNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: { id: string; email: string };
}

export interface AdminOrderDetailResponse {
  id: string;
  timeline: SerializedTimelineEvent[];
  notes: SerializedAdminNote[];
}
