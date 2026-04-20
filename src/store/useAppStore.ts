'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, Activity, Itinerary, MinervaMessage, TripTab, User } from '@/types';

interface UIState {
  tripTab: TripTab;
  selectedDay: number;
  menuOpen: boolean;
  minervaOpen: boolean;
  dayModalOpen: boolean;
  tempActivity: Partial<Activity> | null;
  editingActivityId: string | null;
  isLoading: boolean;
  minervaLoading: boolean;
  minervaMessages: MinervaMessage[];
}

interface AppState extends UIState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Trip
  currentTrip: Trip | null;
  allTrips: Trip[];
  setCurrentTrip: (trip: Trip | null) => void;
  setAllTrips: (trips: Trip[]) => void;
  updateItinerary: (itinerary: Itinerary) => void;
  addActivity: (dayNumber: number, activity: Activity) => void;
  updateActivity: (dayNumber: number, activity: Activity) => void;
  deleteActivity: (dayNumber: number, activityId: string) => void;

  // UI
  setTripTab: (tab: TripTab) => void;
  setSelectedDay: (day: number) => void;
  setMenuOpen: (open: boolean) => void;
  setMinervaOpen: (open: boolean) => void;
  setDayModalOpen: (open: boolean) => void;
  setTempActivity: (activity: Partial<Activity> | null) => void;
  setEditingActivityId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setMinervaLoading: (loading: boolean) => void;

  // Minerva
  addMinervaMessage: (msg: MinervaMessage) => void;
  clearMinervaMessages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial UI state
      tripTab: 'overview',
      selectedDay: 0,
      menuOpen: false,
      minervaOpen: false,
      dayModalOpen: false,
      tempActivity: null,
      editingActivityId: null,
      isLoading: false,
      minervaLoading: false,
      minervaMessages: [],

      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Trip
      currentTrip: null,
      allTrips: [],
      setCurrentTrip: (trip) => set({ currentTrip: trip }),
      setAllTrips: (trips) => set({ allTrips: trips }),

      updateItinerary: (itinerary) =>
        set((state) => ({
          currentTrip: state.currentTrip
            ? { ...state.currentTrip, itinerary }
            : null,
        })),

      addActivity: (dayNumber, activity) =>
        set((state) => {
          if (!state.currentTrip) return state;
          const itinerary = { ...(state.currentTrip.itinerary || {}) };
          itinerary[dayNumber] = [...(itinerary[dayNumber] || []), activity];
          return {
            currentTrip: { ...state.currentTrip, itinerary },
          };
        }),

      updateActivity: (dayNumber, activity) =>
        set((state) => {
          if (!state.currentTrip) return state;
          const itinerary = { ...(state.currentTrip.itinerary || {}) };
          itinerary[dayNumber] = (itinerary[dayNumber] || []).map((a) =>
            a.id === activity.id ? activity : a
          );
          return { currentTrip: { ...state.currentTrip, itinerary } };
        }),

      deleteActivity: (dayNumber, activityId) =>
        set((state) => {
          if (!state.currentTrip) return state;
          const itinerary = { ...(state.currentTrip.itinerary || {}) };
          itinerary[dayNumber] = (itinerary[dayNumber] || []).filter(
            (a) => a.id !== activityId
          );
          return { currentTrip: { ...state.currentTrip, itinerary } };
        }),

      // UI setters
      setTripTab: (tab) => set({ tripTab: tab }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      setMenuOpen: (open) => set({ menuOpen: open }),
      setMinervaOpen: (open) => set({ minervaOpen: open }),
      setDayModalOpen: (open) => set({ dayModalOpen: open }),
      setTempActivity: (activity) => set({ tempActivity: activity }),
      setEditingActivityId: (id) => set({ editingActivityId: id }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setMinervaLoading: (loading) => set({ minervaLoading: loading }),

      // Minerva
      addMinervaMessage: (msg) =>
        set((state) => ({
          minervaMessages: [...state.minervaMessages, msg],
        })),
      clearMinervaMessages: () => set({ minervaMessages: [] }),
    }),
    {
      name: 'tripup-store',
      partialize: (state) => ({
        user: state.user,
        currentTrip: state.currentTrip,
        allTrips: state.allTrips,
        selectedDay: state.selectedDay,
        minervaMessages: state.minervaMessages,
      }),
    }
  )
);
