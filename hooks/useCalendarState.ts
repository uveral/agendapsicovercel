import { create } from 'zustand';

interface CalendarState {
  selectedTherapist: string;
  viewType: 'general' | 'individual';
  calendarView: 'monthly' | 'weekly';
  setSelectedTherapist: (id: string) => void;
  setViewType: (type: 'general' | 'individual') => void;
  setCalendarView: (view: 'monthly' | 'weekly') => void;
  reset: () => void;
}

const initialState = {
  selectedTherapist: 'all',
  viewType: 'general' as const,
  calendarView: 'monthly' as const,
};

export const useCalendarState = create<CalendarState>((set) => ({
  ...initialState,
  setSelectedTherapist: (id) => {
    set({ selectedTherapist: id });
  },
  setViewType: (type) => {
    set({ viewType: type });
  },
  setCalendarView: (view) => {
    set({ calendarView: view });
  },
  reset: () => {
    set(initialState);
  },
}));
