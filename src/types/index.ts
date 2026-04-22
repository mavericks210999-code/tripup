export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  isAnonymous?: boolean;
  trips?: number;
  countries?: number;
  memberSince?: string;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  initial: string;
  role?: 'editor' | 'viewer';
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  category: string;
  location: string;
  notes?: string;
  icon?: string;
  completed?: boolean;
  highlight?: boolean;
  autoAdded?: boolean;
  transportNote?: string;
  transportTime?: string;
}

export interface ItineraryDay {
  date: string; // "Day 1" or "Jun 10"
  dayNumber?: number;
  activities: Activity[];
}

export interface Itinerary {
  [dayNumber: number]: Activity[];
}

export interface Trip {
  id: string;
  destination: string;
  country?: string;
  dates: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  participants: Participant[];
  ownerId: string;
  itinerary?: Itinerary;
  createdAt?: number;
  inviteCode?: string;
  preferences?: TripPreferences;
}

export interface TripPreferences {
  budget?: string;
  style?: string[];
  dietary?: string[];
  pace?: 'relaxed' | 'moderate' | 'packed';
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string; // participant id
  paidByName: string;
  date: string;
  split: { participantId: string; amount: number }[];
  createdAt?: number;
}

export interface Balance {
  participantId: string;
  name: string;
  photoURL?: string;
  amount: number; // positive = owed to you, negative = you owe them
  status: 'owe' | 'settled' | 'owedToYou';
}

export interface ExplorePlace {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  time: string;
  price: string;
  priceLevel: string;
  image: string;
  description: string;
  openTill: string;
  location?: string;
}

export interface MinervaMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type TripTab = 'overview' | 'itinerary' | 'explore' | 'expenses';
