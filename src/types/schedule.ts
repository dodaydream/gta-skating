export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Program {
  id: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  name: string;
  notes?: string;
}

export interface ProgramItem extends Program {
  arena: import("./arena").Arena;
}

export interface Schedule {
  updatedAt: string;
  programs: Program[];
}