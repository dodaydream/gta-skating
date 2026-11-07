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
import fieldgate from "./fieldgate-sports-complex.json";
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
import iroquois from "./iroquois-park-sports-centre.json";
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
import mckinney from "./mckinney-centre.json";
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
import stouffvilleArena from "./stouffville-arena.json";
import stouffvilleClippers from "./stouffville-clippers-sports-complex.json";
import thornhill from "./thornhill-community-centre.json";
import tomGraham from "./tom-graham-arena.json";
import trisan from "./trisan-centre.json";
import varsityCentreArena from "./varsity-centre-arena.json";
import victoriaVillage from "./victoria-village-arena.json";
import woodbridgePool from "./woodbridge-pool-memorial-arena.json";
import yorkMills from "./york-mills-arena.json";
import zancor from "./zancor-centre.json";
import albertCampbellSquare from "./albert-campbell-square.json";
import alexandraPark from "./alexandra-park.json";
import broadlandsCommunityCentre from "./broadlands-community-centre.json";
import buttonwoodPark from "./buttonwood-park.json";
import campbellAvenuePark from "./campbell-avenue-park.json";
import cedarvalePark from "./cedarvale-park.json";
import christiePits from "./christie-pits.json";
import collegePark from "./college-park.json";
import colonelSamuelSmithPark from "./colonel-samuel-smith-park.json";
import dieppePark from "./dieppe-park.json";
import dufferinGrove from "./dufferin-grove.json";
import ethennonnhawahstihnenPark from "./ethennonnhawahstihnen-park.json";
import fordPerformanceCentre from "./ford-performance-centre.json";
import giovanniCaboto from "./giovanni-caboto.json";
import glenLongCommunityCentre from "./glen-long-community-centre.json";
import greenwoodPark from "./greenwood-park.json";
import highPark from "./high-park.json";
import hodgsonLeisureSchoolGrounds from "./hodgson-leisure-school-grounds.json";
import humberValleyRink from "./humber-valley-rink.json";
import irvingWChapleyCommunityCentre from "./irving-w-chapley-community-centre.json";
import jimmieSimpsonPark from "./jimmie-simpson-park.json";
import josephBannonPark from "./joseph-bannon-park.json";
import kewGardens from "./kew-gardens.json";
import lambtonKingswayRink from "./lambton-kingsway-rink.json";
import ledburyPark from "./ledbury-park.json";
import mccormickArena from "./mccormick-arena.json";
import mccowanDistrictPark from "./mccowan-district-park.json";
import melLastmanSquare from "./mel-lastman-square.json";
import monarchPark from "./monarch-park.json";
import nathanPhillipsSquare from "./nathan-phillips-square.json";
import northTorontoMemorialArena from "./north-toronto-memorial-arena.json";
import northTorontoMemorialCommunityRecreationCentreEglintonPark from "./north-toronto-memorial-community-recreation-centre-eglinton-park.json";
import otterCreekCentre from "./otter-creek-centre.json";
import princeOfWalesRink from "./prince-of-wales-rink.json";
import queenswayRink from "./queensway-rink.json";
import ramsdenPark from "./ramsden-park.json";
import regentParkAthleticGrounds from "./regent-park-athletic-grounds.json";
import renniePark from "./rennie-park.json";
import rivercrestRink from "./rivercrest-rink.json";
import riverdaleParkEast from "./riverdale-park-east.json";
import rosedalePark from "./rosedale-park.json";
import royalcrestRink from "./royalcrest-rink.json";
import sherbourneCommon from "./sherbourne-common.json";
import sirAdamBeckRink from "./sir-adam-beck-rink.json";
import summerleaRink from "./summerlea-rink.json";
import sunnydaleAcresRink from "./sunnydale-acres-rink.json";
import tedReeveCommunityArena from "./ted-reeve-community-arena.json";
import torontoMetropolitanUniversitySquare from "./toronto-metropolitan-university-square.json";
import trinityBellwoodsPark from "./trinity-bellwoods-park.json";
import valleyfieldPark from "./valleyfield-park.json";
import vanHornePark from "./van-horne-park.json";
import wallaceEmersonPark from "./wallace-emerson-park.json";
import wedgewoodParkEtobicoke from "./wedgewood-park-etobicoke.json";
import westDeanePark from "./west-deane-park.json";
import westMallOutdoorRinkDennisFlynnPark from "./west-mall-outdoor-rink-dennis-flynn-park.json";
import westgroveRink from "./westgrove-rink.json";
import westonLionsRecreationArena from "./weston-lions-recreation-arena.json";
import westwayOutdoorRink from "./westway-outdoor-rink.json";
import williamHBoltonArena from "./william-h-bolton-arena.json";
import withrowPark from "./withrow-park.json";

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
  fieldgate as Venue,
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
  iroquois as Venue,
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
  mckinney as Venue,
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
  stouffvilleArena as Venue,
  stouffvilleClippers as Venue,
  thornhill as Venue,
  tomGraham as Venue,
  trisan as Venue,
  varsityCentreArena as Venue,
  victoriaVillage as Venue,
  woodbridgePool as Venue,
  yorkMills as Venue,
  zancor as Venue,
  albertCampbellSquare as Venue,
  alexandraPark as Venue,
  broadlandsCommunityCentre as Venue,
  buttonwoodPark as Venue,
  campbellAvenuePark as Venue,
  cedarvalePark as Venue,
  christiePits as Venue,
  collegePark as Venue,
  colonelSamuelSmithPark as Venue,
  dieppePark as Venue,
  dufferinGrove as Venue,
  ethennonnhawahstihnenPark as Venue,
  fordPerformanceCentre as Venue,
  giovanniCaboto as Venue,
  glenLongCommunityCentre as Venue,
  greenwoodPark as Venue,
  highPark as Venue,
  hodgsonLeisureSchoolGrounds as Venue,
  humberValleyRink as Venue,
  irvingWChapleyCommunityCentre as Venue,
  jimmieSimpsonPark as Venue,
  josephBannonPark as Venue,
  kewGardens as Venue,
  lambtonKingswayRink as Venue,
  ledburyPark as Venue,
  mccormickArena as Venue,
  mccowanDistrictPark as Venue,
  melLastmanSquare as Venue,
  monarchPark as Venue,
  nathanPhillipsSquare as Venue,
  northTorontoMemorialArena as Venue,
  northTorontoMemorialCommunityRecreationCentreEglintonPark as Venue,
  otterCreekCentre as Venue,
  princeOfWalesRink as Venue,
  queenswayRink as Venue,
  ramsdenPark as Venue,
  regentParkAthleticGrounds as Venue,
  renniePark as Venue,
  rivercrestRink as Venue,
  riverdaleParkEast as Venue,
  rosedalePark as Venue,
  royalcrestRink as Venue,
  sherbourneCommon as Venue,
  sirAdamBeckRink as Venue,
  summerleaRink as Venue,
  sunnydaleAcresRink as Venue,
  tedReeveCommunityArena as Venue,
  torontoMetropolitanUniversitySquare as Venue,
  trinityBellwoodsPark as Venue,
  valleyfieldPark as Venue,
  vanHornePark as Venue,
  wallaceEmersonPark as Venue,
  wedgewoodParkEtobicoke as Venue,
  westDeanePark as Venue,
  westMallOutdoorRinkDennisFlynnPark as Venue,
  westgroveRink as Venue,
  westonLionsRecreationArena as Venue,
  westwayOutdoorRink as Venue,
  williamHBoltonArena as Venue,
  withrowPark as Venue,
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
