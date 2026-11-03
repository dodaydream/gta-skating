import type { Venue } from "@/types/venue";
import { slugify } from "@/lib/slug";

import billBolton from "./bill-bolton-arena.json";
import agincourt from "./agincourt-recreation-centre.json";
import albion from "./albion-arena.json";
import amesbury from "./amesbury-sports-complex.json";
import angelaJames from "./angela-james-arena.json";
import baycrest from "./baycrest-arena.json";
import bayview from "./bayview-arena.json";
import bondLake from "./bond-lake-arena.json";
import burnhamthorpe from "./burnhamthorpe-community-centre.json";
import carmenCorbasson from "./carmen-corbasson-community-centre.json";
import cwenchCentreEtobicoke from "./canlan-cwench-centre-etobicoke.json";
import entripyCentreOakville from "./canlan-entripy-centre-oakville.json";
import nfpAthleticCentreYork from "./canlan-nfp-athletic-centre-york.json";
import oshawa from "./canlan-oshawa.json";
import scarborough from "./canlan-scarborough.json";
import centennialEtobicoke from "./centennial-park-arena-etobicoke.json";
import centennialScarborough from "./centennial-recreation-centre-scarborough.json";
import central from "./central-arena.json";
import chrisTonks from "./chris-tonks-arena.json";
import clarkson from "./clarkson-community-centre.json";
import commander from "./commander-recreation-centre.json";
import cummerPark from "./cummer-park-community-centre.json";
import donMillsCivitan from "./don-mills-civitan-arena.json";
import donMontgomery from "./don-montgomery-community-centre.json";
import downsview from "./downsview-arena.json";
import eastYorkMemorial from "./east-york-memorial-arena.json";
import edSackfield from "./ed-sackfield-arena.json";
import elginBarrow from "./elgin-barrow-arena.json";
import erinMillsTwin from "./erin-mills-twin-arena.json";
import fenside from "./fenside-arena.json";
import georgeBell from "./george-bell-arena.json";
import gordAndIreneRisk from "./gord-and-irene-risk-community-centre.json";
import goulding from "./goulding-community-centre.json";
import grandravine from "./grandravine-community-recreation-centre.json";
import habitant from "./habitant-arena.json";
import carnegie from "./herbert-h-carnegie-centennial-centre.json";
import heronPark from "./heron-park-community-recreation-centre.json";
import huronPark from "./huron-park-recreation-centre.json";
import iceland from "./iceland-arena.json";
import johnBoothMemorial from "./john-booth-memorial-arena.json";
import lambton from "./lambton-arena.json";
import larryGrossman from "./larry-grossman-forest-hill-arena.json";
import leasideGardens from "./leaside-gardens.json";
import longBranch from "./long-branch-arena.json";
import malvern from "./malvern-recreation-centre.json";
import mattamy from "./mattamy-athletic-centre.json";
import mcgregorPark from "./mcgregor-park-community-centre.json";
import meadowvale4Rinks from "./meadowvale-4-rinks.json";
import mimico from "./mimico-arena.json";
import mississaugaValley from "./mississauga-valley-community-centre.json";
import mitchellField from "./mitchell-field-community-centre.json";
import mossPark from "./moss-park-arena.json";
import oriole from "./oriole-community-centre.json";
import parkLawnBubble from "./park-lawn-bubble-rink.json";
import paulCoffey from "./paul-coffey-arena.json";
import philWhite from "./phil-white-arena.json";
import pinePoint from "./pine-point-arena.json";
import pleasantview from "./pleasantview-community-centre.json";
import portCreditMemorial from "./port-credit-memorial-arena.json";
import roding from "./roding-community-centre.json";
import scarboroughGardens from "./scarborough-arena-gardens.json";
import scarboroughVillage from "./scarborough-village-recreation-centre.json";
import tomGraham from "./tom-graham-arena.json";
import varsityCentreArena from "./varsity-centre-arena.json";
import victoriaVillage from "./victoria-village-arena.json";
import yorkMills from "./york-mills-arena.json";

export const venues: Venue[] = [
  billBolton as Venue,
  agincourt as Venue,
  albion as Venue,
  amesbury as Venue,
  angelaJames as Venue,
  baycrest as Venue,
  bayview as Venue,
  bondLake as Venue,
  burnhamthorpe as Venue,
  carmenCorbasson as Venue,
  cwenchCentreEtobicoke as Venue,
  entripyCentreOakville as Venue,
  nfpAthleticCentreYork as Venue,
  oshawa as Venue,
  scarborough as Venue,
  centennialEtobicoke as Venue,
  centennialScarborough as Venue,
  central as Venue,
  chrisTonks as Venue,
  clarkson as Venue,
  commander as Venue,
  cummerPark as Venue,
  donMillsCivitan as Venue,
  donMontgomery as Venue,
  downsview as Venue,
  eastYorkMemorial as Venue,
  edSackfield as Venue,
  elginBarrow as Venue,
  erinMillsTwin as Venue,
  fenside as Venue,
  georgeBell as Venue,
  gordAndIreneRisk as Venue,
  goulding as Venue,
  grandravine as Venue,
  habitant as Venue,
  carnegie as Venue,
  heronPark as Venue,
  huronPark as Venue,
  iceland as Venue,
  johnBoothMemorial as Venue,
  lambton as Venue,
  larryGrossman as Venue,
  leasideGardens as Venue,
  longBranch as Venue,
  malvern as Venue,
  mattamy as Venue,
  mcgregorPark as Venue,
  meadowvale4Rinks as Venue,
  mimico as Venue,
  mississaugaValley as Venue,
  mitchellField as Venue,
  mossPark as Venue,
  oriole as Venue,
  parkLawnBubble as Venue,
  paulCoffey as Venue,
  philWhite as Venue,
  pinePoint as Venue,
  pleasantview as Venue,
  portCreditMemorial as Venue,
  roding as Venue,
  scarboroughGardens as Venue,
  scarboroughVillage as Venue,
  tomGraham as Venue,
  varsityCentreArena as Venue,
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
