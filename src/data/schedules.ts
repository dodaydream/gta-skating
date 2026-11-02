import type { Venue } from "@/types/venue";
import { slugify } from "@/lib/slug";

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

export const venues: Venue[] = [
  billBolton as Venue,
  agincourt as Venue,
  albion as Venue,
  amesbury as Venue,
  angelaJames as Venue,
  baycrest as Venue,
  bayview as Venue,
  bondLake as Venue,
  centennialEtobicoke as Venue,
  centennialScarborough as Venue,
  central as Venue,
  chrisTonks as Venue,
  commander as Venue,
  cummerPark as Venue,
  donMillsCivitan as Venue,
  donMontgomery as Venue,
  downsview as Venue,
  eastYorkMemorial as Venue,
  edSackfield as Venue,
  elginBarrow as Venue,
  fenside as Venue,
  gordAndIreneRisk as Venue,
  goulding as Venue,
  grandravine as Venue,
  habitant as Venue,
  carnegie as Venue,
  heronPark as Venue,
  johnBoothMemorial as Venue,
  lambton as Venue,
  longBranch as Venue,
  malvern as Venue,
  mcgregorPark as Venue,
  mimico as Venue,
  mitchellField as Venue,
  oriole as Venue,
  parkLawnBubble as Venue,
  philWhite as Venue,
  pinePoint as Venue,
  pleasantview as Venue,
  roding as Venue,
  scarboroughGardens as Venue,
  scarboroughVillage as Venue,
  tomGraham as Venue,
  victoriaVillage as Venue,
  yorkMills as Venue,
];

const bySlug = new Map<string, Venue>();
for (const venue of venues) {
  bySlug.set(slugify(venue.name), venue);
}

export function getVenueBySlug(slug: string): Venue | undefined {
  return bySlug.get(slug);
}

export function getSlugForVenue(name: string): string {
  return slugify(name);
}
