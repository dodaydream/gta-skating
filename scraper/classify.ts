import { ProgramType } from "./types.ts";

/**
 * Map a raw program / section name to its canonical program type.
 *
 * Everything that is not a recognized hockey, figure-skating, stick-and-puck,
 * ringette or breakdancing program is treated as a public skate.
 */
export function classifyProgram(name: string): ProgramType {
  const lower = name.toLowerCase();

  if (lower.includes("breakdanc")) return ProgramType.IceBreakdancing;
  if (
    lower.includes("shinny") ||
    lower.includes("pick up hockey") ||
    lower.includes("pickup hockey") ||
    lower.includes("co-ed") ||
    lower.includes("coed")
  ) {
    return ProgramType.PickupHockey;
  }
  if (lower.includes("figure skating")) return ProgramType.FigureSkating;
  if (lower.includes("stick and puck") || lower.includes("stick & puck")) {
    return ProgramType.StickAndPuck;
  }
  if (lower.includes("ringette")) return ProgramType.Ringette;

  return ProgramType.PublicSkate;
}
