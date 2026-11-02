import type { Arena } from "@/types/arena";

import billBolton from "./bill-bolton.json";
import agincourt from "./agincourt.json";
import albion from "./albion.json";
import amesbury from "./amesbury-sports-complex.json";
import angelaJames from "./angela-james.json";
import baycrest from "./baycrest.json";
import bayview from "./bayview.json";
import bondLake from "./bond-lake-arena.json";
import centennialEtobicoke from "./centennial-park-etobicoke.json";
import centennialScarborough from "./centennial-scarborough.json";
import central from "./central.json";
import chrisTonks from "./chris-tonks.json";
import commander from "./commander.json";
import cummerPark from "./cummer-park.json";
import donMillsCivitan from "./don-mills-civitan.json";
import donMontgomery from "./don-montgomery.json";
import downsview from "./downsview.json";
import eastYorkMemorial from "./east-york-memorial.json";
import edSackfield from "./ed-sackfield-arena.json";
import elginBarrow from "./elgin-barrow-arena.json";
import fenside from "./fenside.json";
import gordAndIreneRisk from "./gord-and-irene-risk.json";
import goulding from "./goulding.json";
import grandravine from "./grandravine-community.json";
import habitant from "./habitant.json";
import carnegie from "./herbert-h-carnegie-centennial-centre.json";
import heronPark from "./heron-park-community.json";
import johnBoothMemorial from "./john-booth-memorial.json";
import lambton from "./lambton.json";
import longBranch from "./long-branch.json";
import malvern from "./malvern.json";
import mcgregorPark from "./mcgregor-park.json";
import mimico from "./mimico.json";
import mitchellField from "./mitchell-field.json";
import oriole from "./oriole.json";
import parkLawnBubble from "./park-lawn-bubble-rink.json";
import philWhite from "./phil-white.json";
import pinePoint from "./pine-point.json";
import pleasantview from "./pleasantview.json";
import roding from "./roding.json";
import scarboroughGardens from "./scarborough-gardens.json";
import scarboroughVillage from "./scarborough-village.json";
import tomGraham from "./tom-graham-arena.json";
import victoriaVillage from "./victoria-village.json";
import yorkMills from "./york-mills.json";

const entries: [string, Arena][] = [
  ["bill-bolton", billBolton as Arena],
  ["agincourt", agincourt as Arena],
  ["albion", albion as Arena],
  ["amesbury-sports-complex", amesbury as Arena],
  ["angela-james", angelaJames as Arena],
  ["baycrest", baycrest as Arena],
  ["bayview", bayview as Arena],
  ["bond-lake-arena", bondLake as Arena],
  ["centennial-park-etobicoke", centennialEtobicoke as Arena],
  ["centennial-scarborough", centennialScarborough as Arena],
  ["central", central as Arena],
  ["chris-tonks", chrisTonks as Arena],
  ["commander", commander as Arena],
  ["cummer-park", cummerPark as Arena],
  ["don-mills-civitan", donMillsCivitan as Arena],
  ["don-montgomery", donMontgomery as Arena],
  ["downsview", downsview as Arena],
  ["east-york-memorial", eastYorkMemorial as Arena],
  ["ed-sackfield-arena", edSackfield as Arena],
  ["elgin-barrow-arena", elginBarrow as Arena],
  ["fenside", fenside as Arena],
  ["gord-and-irene-risk", gordAndIreneRisk as Arena],
  ["goulding", goulding as Arena],
  ["grandravine-community", grandravine as Arena],
  ["habitant", habitant as Arena],
  ["herbert-h-carnegie-centennial-centre", carnegie as Arena],
  ["heron-park-community", heronPark as Arena],
  ["john-booth-memorial", johnBoothMemorial as Arena],
  ["lambton", lambton as Arena],
  ["long-branch", longBranch as Arena],
  ["malvern", malvern as Arena],
  ["mcgregor-park", mcgregorPark as Arena],
  ["mimico", mimico as Arena],
  ["mitchell-field", mitchellField as Arena],
  ["oriole", oriole as Arena],
  ["park-lawn-bubble-rink", parkLawnBubble as Arena],
  ["phil-white", philWhite as Arena],
  ["pine-point", pinePoint as Arena],
  ["pleasantview", pleasantview as Arena],
  ["roding", roding as Arena],
  ["scarborough-gardens", scarboroughGardens as Arena],
  ["scarborough-village", scarboroughVillage as Arena],
  ["tom-graham-arena", tomGraham as Arena],
  ["victoria-village", victoriaVillage as Arena],
  ["york-mills", yorkMills as Arena],
];

const slugMap = new Map(entries);

export const arenas = entries.map(([, a]) => a);

export function getArenaBySlug(slug: string): Arena | undefined {
  return slugMap.get(slug);
}

export function getSlugForArena(name: string): string | undefined {
  for (const [slug, arena] of entries) {
    if (arena.name === name) return slug;
  }
  return undefined;
}
