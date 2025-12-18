export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventType {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description?: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  locationType: 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom';
  locationValue?: string;
  isActive: boolean;
  minimumNotice: number;
  color?: string;
}

export interface Availability {
  id: string;
  userId: string;
  weekday: number; // 0-6, 0 = Sunday
  startTime: number; // minutes from midnight
  endTime: number; // minutes from midnight
}

export interface AvailabilityOverride {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  isUnavailable: boolean;
  startTime?: number;
  endTime?: number;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  hostId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeTimezone: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'pending';
  rescheduleToken?: string;
  cancelToken?: string;
  notes?: string;
  eventType?: EventType;
  host?: User;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  startTime: Date;
  endTime: Date;
}
