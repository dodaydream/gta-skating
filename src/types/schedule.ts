export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Program {
  id: string;
  start: string; // HH:MM
  end: string; // HH:MM
  name: string;
  notes?: string;
}

export interface ProgramItem extends Program {
  date: string; // YYYY-MM-DD
  arena: import("./arena").Arena;
}

export interface ArenaEvent {
  date: string; // YYYY-MM-DD
  programs: Program[];
}

export interface Schedule {
  updatedAt: string;
  events: ArenaEvent[];
}