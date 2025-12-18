import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, EventType, Availability, Booking } from '@/types/scheduling';
import { v4 as uuidv4 } from 'uuid';

interface SchedulingContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  eventTypes: EventType[];
  setEventTypes: (eventTypes: EventType[]) => void;
  addEventType: (eventType: Omit<EventType, 'id' | 'userId'>) => EventType;
  updateEventType: (id: string, updates: Partial<EventType>) => void;
  deleteEventType: (id: string) => void;
  availability: Availability[];
  setAvailability: (availability: Availability[]) => void;
  updateAvailability: (newAvailability: Availability[]) => void;
  bookings: Booking[];
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Omit<Booking, 'id'>) => Booking;
  cancelBooking: (id: string) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

// Mock data for demonstration
const mockUser: User = {
  id: '1',
  email: 'alex@scheduler.com',
  name: 'Alex Thompson',
  username: 'alex',
  timezone: 'America/Los_Angeles',
  avatar: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEventTypes: EventType[] = [
  {
    id: '1',
    userId: '1',
    title: '15 Min Meeting',
    slug: '15min',
    description: 'Quick sync or introduction call',
    duration: 15,
    bufferBefore: 0,
    bufferAfter: 5,
    locationType: 'google_meet',
    isActive: true,
    minimumNotice: 60,
    color: '#F5A623',
  },
  {
    id: '2',
    userId: '1',
    title: '30 Min Meeting',
    slug: '30min',
    description: 'Standard meeting length for most discussions',
    duration: 30,
    bufferBefore: 5,
    bufferAfter: 5,
    locationType: 'google_meet',
    isActive: true,
    minimumNotice: 120,
    color: '#6B7B3C',
  },
  {
    id: '3',
    userId: '1',
    title: 'Consultation',
    slug: 'consult',
    description: 'In-depth consultation session',
    duration: 60,
    bufferBefore: 10,
    bufferAfter: 10,
    locationType: 'google_meet',
    isActive: false,
    minimumNotice: 1440,
    color: '#8B5CF6',
  },
];

const mockAvailability: Availability[] = [
  { id: '1', userId: '1', weekday: 1, startTime: 540, endTime: 1020 }, // Mon 9-17
  { id: '2', userId: '1', weekday: 2, startTime: 540, endTime: 1020 }, // Tue 9-17
  { id: '3', userId: '1', weekday: 3, startTime: 540, endTime: 1020 }, // Wed 9-17
  { id: '4', userId: '1', weekday: 4, startTime: 540, endTime: 1020 }, // Thu 9-17
  { id: '5', userId: '1', weekday: 5, startTime: 540, endTime: 1020 }, // Fri 9-17
];

const mockBookings: Booking[] = [
  {
    id: '1',
    eventTypeId: '2',
    hostId: '1',
    attendeeName: 'Sarah Chen',
    attendeeEmail: 'sarah@example.com',
    attendeeTimezone: 'America/New_York',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
    status: 'confirmed',
    notes: 'Intro call about project collaboration',
  },
  {
    id: '2',
    eventTypeId: '2',
    hostId: '1',
    attendeeName: 'Mike Johnson',
    attendeeEmail: 'mike@example.com',
    attendeeTimezone: 'Europe/London',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 10.5 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
    status: 'confirmed',
    notes: 'Product demo',
  },
];

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('scheduling_auth');
    if (stored) {
      const data = JSON.parse(stored);
      setUser(data.user);
      setEventTypes(data.eventTypes || mockEventTypes);
      setAvailability(data.availability || mockAvailability);
      setBookings(data.bookings?.map((b: any) => ({
        ...b,
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
      })) || mockBookings);
      setIsAuthenticated(true);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem('scheduling_auth', JSON.stringify({
        user,
        eventTypes,
        availability,
        bookings,
      }));
    }
  }, [user, eventTypes, availability, bookings, isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (email && password.length >= 6) {
      setUser(mockUser);
      setEventTypes(mockEventTypes);
      setAvailability(mockAvailability);
      setBookings(mockBookings);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (name && email && password.length >= 6) {
      const newUser: User = {
        ...mockUser,
        id: uuidv4(),
        name,
        email,
        username: email.split('@')[0],
      };
      setUser(newUser);
      setEventTypes([]);
      setAvailability(mockAvailability);
      setBookings([]);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setEventTypes([]);
    setAvailability([]);
    setBookings([]);
    setIsAuthenticated(false);
    localStorage.removeItem('scheduling_auth');
  };

  const addEventType = (eventType: Omit<EventType, 'id' | 'userId'>): EventType => {
    const newEventType: EventType = {
      ...eventType,
      id: uuidv4(),
      userId: user?.id || '1',
    };
    setEventTypes(prev => [...prev, newEventType]);
    return newEventType;
  };

  const updateEventType = (id: string, updates: Partial<EventType>) => {
    setEventTypes(prev => prev.map(et => 
      et.id === id ? { ...et, ...updates } : et
    ));
  };

  const deleteEventType = (id: string) => {
    setEventTypes(prev => prev.filter(et => et.id !== id));
  };

  const updateAvailability = (newAvailability: Availability[]) => {
    setAvailability(newAvailability);
  };

  const addBooking = (booking: Omit<Booking, 'id'>): Booking => {
    const newBooking: Booking = {
      ...booking,
      id: uuidv4(),
    };
    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.map(b => 
      b.id === id ? { ...b, status: 'cancelled' as const } : b
    ));
  };

  return (
    <SchedulingContext.Provider value={{
      user,
      setUser,
      eventTypes,
      setEventTypes,
      addEventType,
      updateEventType,
      deleteEventType,
      availability,
      setAvailability,
      updateAvailability,
      bookings,
      setBookings,
      addBooking,
      cancelBooking,
      isAuthenticated,
      login,
      signup,
      logout,
    }}>
      {children}
    </SchedulingContext.Provider>
  );
}

export function useScheduling() {
  const context = useContext(SchedulingContext);
  if (context === undefined) {
    throw new Error('useScheduling must be used within a SchedulingProvider');
  }
  return context;
}
