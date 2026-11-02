export interface Coordinates {
  lat: number;
  lon: number;
}

export enum ProgramType {
  PublicSkate = "Public Skate",
  PickupHockey = "Pickup Hockey",
  FigureSkating = "Figure Skating",
  StickAndPuck = "Stick and Puck",
  Ringette = "Ringette",
  IceBreakdancing = "Ice Breakdancing",
}

export interface Program {
  id: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  name: string;
  type: ProgramType;
  notes?: string;
}

export interface ProgramItem extends Program {
  arena: import("./arena").Arena;
}

export interface Schedule {
  updatedAt: string;
  programs: Program[];
}