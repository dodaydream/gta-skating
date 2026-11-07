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
  /** External id from the source (e.g. Toronto's Course_ID + date + start). */
  refId?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  name: string;
  type: ProgramType;
  notes?: string;
  /** Drop-in ticket price in CAD; 0 means the program is free. */
  ticket: number;
}

export interface ProgramItem extends Program {
  venue: import("./venue").Venue;
}

export interface Schedule {
  updatedAt: string;
  programs: Program[];
}