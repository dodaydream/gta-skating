import type { Venue } from "@/types/venue";
import { slugify } from "@/lib/slug";

import billBolton from "./bill-bolton-arena.json";
import agincourt from "./agincourt-recreation-centre.json";
import albion from "./albion-arena.json";
import alPalladini from "./al-palladini-community-centre.json";
import amesbury from "./amesbury-sports-complex.json";
import angelaJames from "./angela-james-arena.json";
import angusGlen from "./angus-glen-community-centre.json";
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
import centennialCommunity from "./centennial-community-centre.json";
import centennialEtobicoke from "./centennial-park-arena-etobicoke.json";
import centennialScarborough from "./centennial-recreation-centre-scarborough.json";
import central from "./central-arena.json";
import chestnutHillDevelopments from "./chestnut-hill-developments-recreation-complex.json";
import chrisTonks from "./chris-tonks-arena.json";
import clarkson from "./clarkson-community-centre.json";
import clatworthy from "./clatworthy-arena.json";
import commander from "./commander-recreation-centre.json";
import crosby from "./crosby-community-centre.json";
import cummerPark from "./cummer-park-community-centre.json";
import donBeer from "./don-beer-arena.json";
import donMillsCivitan from "./don-mills-civitan-arena.json";
import donMontgomery from "./don-montgomery-community-centre.json";
import downsview from "./downsview-arena.json";
import eastYorkMemorial from "./east-york-memorial-arena.json";
import edSackfield from "./ed-sackfield-arena.json";
import elginBarrow from "./elgin-barrow-arena.json";
import erinMillsTwin from "./erin-mills-twin-arena.json";
import fenside from "./fenside-arena.json";
import garnetAWilliams from "./garnet-a-williams-community-centre.json";
import georgeBell from "./george-bell-arena.json";
import gordAndIreneRisk from "./gord-and-irene-risk-community-centre.json";
import goulding from "./goulding-community-centre.json";
import grandravine from "./grandravine-community-recreation-centre.json";
import habitant from "./habitant-arena.json";
import carnegie from "./herbert-h-carnegie-centennial-centre.json";
import heronPark from "./heron-park-community-recreation-centre.json";
import honeyBarry from "./honey-barry-memorial-arena.json";
import huronPark from "./huron-park-recreation-centre.json";
import iceland from "./iceland-arena.json";
import johnBoothMemorial from "./john-booth-memorial-arena.json";
import lambton from "./lambton-arena.json";
import larryGrossman from "./larry-grossman-forest-hill-arena.json";
import leasideGardens from "./leaside-gardens.json";
import longBranch from "./long-branch-arena.json";
import malvern from "./malvern-recreation-centre.json";
import mapleCommunity from "./maple-community-centre.json";
import markhamVillage from "./markham-village-community-centre.json";
import mattamy from "./mattamy-athletic-centre.json";
import mcgregorPark from "./mcgregor-park-community-centre.json";
import meadowvale4Rinks from "./meadowvale-4-rinks.json";
import mimico from "./mimico-arena.json";
import millikenMills from "./milliken-mills-community-centre.json";
import mississaugaValley from "./mississauga-valley-community-centre.json";
import mitchellField from "./mitchell-field-community-centre.json";
import mossPark from "./moss-park-arena.json";
import mountJoy from "./mount-joy-community-centre.json";
import nobleton from "./nobleton-arena-community-centre.json";
import oriole from "./oriole-community-centre.json";
import parkLawnBubble from "./park-lawn-bubble-rink.json";
import paulCoffey from "./paul-coffey-arena.json";
import philWhite from "./phil-white-arena.json";
import pinePoint from "./pine-point-arena.json";
import pleasantview from "./pleasantview-community-centre.json";
import portCreditMemorial from "./port-credit-memorial-arena.json";
import roding from "./roding-community-centre.json";
import rosemount from "./rosemount-community-centre.json";
import scarboroughGardens from "./scarborough-arena-gardens.json";
import scarboroughVillage from "./scarborough-village-recreation-centre.json";
import thornhill from "./thornhill-community-centre.json";
import tomGraham from "./tom-graham-arena.json";
import trisan from "./trisan-centre.json";
import varsityCentreArena from "./varsity-centre-arena.json";
import victoriaVillage from "./victoria-village-arena.json";
import woodbridgePool from "./woodbridge-pool-memorial-arena.json";
import yorkMills from "./york-mills-arena.json";
import zancor from "./zancor-centre.json";

export const venues: Venue[] = [
  billBolton as Venue,
  agincourt as Venue,
  albion as Venue,
  alPalladini as Venue,
  amesbury as Venue,
  angelaJames as Venue,
  angusGlen as Venue,
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
  centennialCommunity as Venue,
  centennialEtobicoke as Venue,
  centennialScarborough as Venue,
  central as Venue,
  chestnutHillDevelopments as Venue,
  chrisTonks as Venue,
  clarkson as Venue,
  clatworthy as Venue,
  commander as Venue,
  crosby as Venue,
  cummerPark as Venue,
  donBeer as Venue,
  donMillsCivitan as Venue,
  donMontgomery as Venue,
  downsview as Venue,
  eastYorkMemorial as Venue,
  edSackfield as Venue,
  elginBarrow as Venue,
  erinMillsTwin as Venue,
  fenside as Venue,
  garnetAWilliams as Venue,
  georgeBell as Venue,
  gordAndIreneRisk as Venue,
  goulding as Venue,
  grandravine as Venue,
  habitant as Venue,
  carnegie as Venue,
  heronPark as Venue,
  honeyBarry as Venue,
  huronPark as Venue,
  iceland as Venue,
  johnBoothMemorial as Venue,
  lambton as Venue,
  larryGrossman as Venue,
  leasideGardens as Venue,
  longBranch as Venue,
  malvern as Venue,
  mapleCommunity as Venue,
  markhamVillage as Venue,
  mattamy as Venue,
  mcgregorPark as Venue,
  meadowvale4Rinks as Venue,
  mimico as Venue,
  millikenMills as Venue,
  mississaugaValley as Venue,
  mitchellField as Venue,
  mossPark as Venue,
  mountJoy as Venue,
  nobleton as Venue,
  oriole as Venue,
  parkLawnBubble as Venue,
  paulCoffey as Venue,
  philWhite as Venue,
  pinePoint as Venue,
  pleasantview as Venue,
  portCreditMemorial as Venue,
  roding as Venue,
  rosemount as Venue,
  scarboroughGardens as Venue,
  scarboroughVillage as Venue,
  thornhill as Venue,
  tomGraham as Venue,
  trisan as Venue,
  varsityCentreArena as Venue,
  victoriaVillage as Venue,
  woodbridgePool as Venue,
  yorkMills as Venue,
  zancor as Venue,
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
