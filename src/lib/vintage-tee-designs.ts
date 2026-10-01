export type VintageTeeSeed = {
  slug: string;
  title: string;
  top: string;
  center: string;
  bottom: string;
  palette: "ink" | "brick" | "gold" | "sage" | "ocean";
  printMethod: "DTF" | "DTG";
  priceCents: number;
};

export const vintageTeeDesigns: VintageTeeSeed[] = [
  { slug: "desert-raceway-tee", title: "Desert Raceway Tee", top: "38 MOTOR CLUB", center: "RACEWAY", bottom: "DUST / SPEED / 1988", palette: "brick", printMethod: "DTG", priceCents: 4800 },
  { slug: "midnight-service-tee", title: "Midnight Service Tee", top: "OPEN ALL NIGHT", center: "38", bottom: "MIDNIGHT SERVICE / EST. 1988", palette: "gold", printMethod: "DTG", priceCents: 4600 },
  { slug: "mountain-supply-tee", title: "Mountain Supply Tee", top: "FIELD GOODS", center: "38°", bottom: "MOUNTAIN SUPPLY CO. / 1976", palette: "sage", printMethod: "DTG", priceCents: 4900 },
  { slug: "lucky-star-social-tee", title: "Lucky Star Social Tee", top: "GOOD FORTUNE CLUB", center: "LUCKY 38", bottom: "MEMBERS SINCE FOREVER", palette: "gold", printMethod: "DTF", priceCents: 4400 },
  { slug: "coastline-tee", title: "Coastline Tee", top: "PACIFIC DIVISION", center: "COASTLINE", bottom: "SALT AIR / SLOW DAYS", palette: "ocean", printMethod: "DTG", priceCents: 4500 },
  { slug: "garage-days-tee", title: "Garage Days Tee", top: "HAND BUILT", center: "GARAGE 38", bottom: "TOOLS DOWN AT SUNSET", palette: "brick", printMethod: "DTF", priceCents: 4700 },
  { slug: "western-trail-tee", title: "Western Trail Tee", top: "WESTERN TRAIL CO.", center: "WILD / FREE", bottom: "SADDLE UP / 1974", palette: "sage", printMethod: "DTG", priceCents: 4900 },
  { slug: "city-courier-tee", title: "City Courier Tee", top: "SAME DAY EXPRESS", center: "CITY 38", bottom: "DELIVERED BEFORE DARK", palette: "ink", printMethod: "DTF", priceCents: 4300 },
  { slug: "sunset-motel-tee", title: "Sunset Motel Tee", top: "VACANCY / VACANCY", center: "SUNSET", bottom: "MOTOR LODGE / 1969", palette: "brick", printMethod: "DTG", priceCents: 4800 },
  { slug: "track-and-field-tee", title: "Track & Field Tee", top: "RUN YOUR OWN RACE", center: "38 TRACK", bottom: "ATHLETIC DEPT. / 1982", palette: "ocean", printMethod: "DTF", priceCents: 4200 },
  { slug: "orchard-union-tee", title: "Orchard Union Tee", top: "PICKED BY HAND", center: "ORCHARD", bottom: "FRUIT GROWERS UNION / 1978", palette: "sage", printMethod: "DTG", priceCents: 4700 },
  { slug: "electric-diner-tee", title: "Electric Diner Tee", top: "COFFEE / PIE / OPEN", center: "ELECTRIC", bottom: "DINER NO. 38 / ALL HOURS", palette: "gold", printMethod: "DTF", priceCents: 4600 },
  { slug: "lake-house-tee", title: "Lake House Tee", top: "EST. BY THE WATER", center: "LAKE CLUB", bottom: "NO PLANS / NO PROBLEM", palette: "ocean", printMethod: "DTG", priceCents: 4500 },
  { slug: "wildflower-farm-tee", title: "Wildflower Farm Tee", top: "GROWN WITH PATIENCE", center: "WILDFLOWER", bottom: "FIELD NOTES / VOL. 38", palette: "sage", printMethod: "DTG", priceCents: 4900 },
  { slug: "record-shop-tee", title: "Record Shop Tee", top: "SIDE A / SIDE B", center: "38 RPM", bottom: "RECORDS / TAPES / GOOD SOUND", palette: "brick", printMethod: "DTF", priceCents: 4400 },
  { slug: "trailhead-tee", title: "Trailhead Tee", top: "TAKE THE LONG WAY", center: "TRAILHEAD", bottom: "PUBLIC LANDS / 1981", palette: "sage", printMethod: "DTG", priceCents: 4800 },
  { slug: "sunday-ceramics-tee", title: "Sunday Ceramics Tee", top: "MADE SLOWLY", center: "SUNDAY", bottom: "CERAMICS STUDIO / 1972", palette: "gold", printMethod: "DTG", priceCents: 5000 },
  { slug: "night-market-tee", title: "Night Market Tee", top: "AFTER DARK ONLY", center: "NIGHT MARKET", bottom: "LANTERNS UP / 38 DOWN", palette: "brick", printMethod: "DTF", priceCents: 4600 },
  { slug: "high-desert-tee", title: "High Desert Tee", top: "DRY COUNTRY CLUB", center: "HIGH DESERT", bottom: "MILES FROM ORDINARY", palette: "sage", printMethod: "DTG", priceCents: 4800 },
  { slug: "harbor-dept-tee", title: "Harbor Dept. Tee", top: "HARBOR DEPARTMENT", center: "38° NORTH", bottom: "TIDE TABLE / 1985", palette: "ocean", printMethod: "DTF", priceCents: 4500 },
  { slug: "roller-rink-tee", title: "Roller Rink Tee", top: "FRIDAY NIGHT ROLL", center: "ROLL ON", bottom: "RINK 38 / SINCE 1979", palette: "brick", printMethod: "DTG", priceCents: 4600 },
  { slug: "campfire-club-tee", title: "Campfire Club Tee", top: "LEAVE IT BETTER", center: "CAMP 38", bottom: "EST. UNDER THE STARS", palette: "gold", printMethod: "DTF", priceCents: 4400 },
  { slug: "old-town-bicycle-tee", title: "Old Town Bicycle Tee", top: "PEDAL MORE / WORRY LESS", center: "OLD TOWN", bottom: "BICYCLE WORKS / 1971", palette: "sage", printMethod: "DTG", priceCents: 4700 },
  { slug: "sundown-tennis-tee", title: "Sundown Tennis Tee", top: "COURT IS CALLING", center: "SUNDOWN", bottom: "RACQUET CLUB / 1984", palette: "ocean", printMethod: "DTF", priceCents: 4300 },
  { slug: "blue-hour-tee", title: "Blue Hour Tee", top: "LAST LIGHT SOCIETY", center: "BLUE HOUR", bottom: "STAY OUT A LITTLE LONGER", palette: "ocean", printMethod: "DTG", priceCents: 4600 },
  { slug: "general-store-tee", title: "General Store Tee", top: "A LITTLE OF EVERYTHING", center: "GENERAL 38", bottom: "EST. 1968 / STILL HERE", palette: "brick", printMethod: "DTG", priceCents: 4800 },
  { slug: "desert-bloom-tee", title: "Desert Bloom Tee", top: "AFTER THE RAIN", center: "DESERT BLOOM", bottom: "SONORAN FIELD GUIDE / 38", palette: "gold", printMethod: "DTG", priceCents: 4900 },
  { slug: "trackside-coffee-tee", title: "Trackside Coffee Tee", top: "FIRST CUP / LAST LAP", center: "TRACKSIDE", bottom: "COFFEE HOUSE / 1977", palette: "brick", printMethod: "DTF", priceCents: 4500 },
  { slug: "slow-lane-tee", title: "Slow Lane Tee", top: "NO RUSH / NO RULES", center: "SLOW LANE", bottom: "DRIVE NICE / LIVE EASY", palette: "sage", printMethod: "DTG", priceCents: 4400 },
  { slug: "field-notes-tee", title: "Field Notes Tee", top: "OBSERVE / WANDER / REPEAT", center: "FIELD NOTES", bottom: "OUTDOOR STUDIES / NO. 38", palette: "sage", printMethod: "DTG", priceCents: 4700 },
  { slug: "summer-camp-tee", title: "Summer Camp Tee", top: "SLEEPOVERS / SUNRISES", center: "CAMP 38", bottom: "SUMMER SESSION / 1980", palette: "gold", printMethod: "DTF", priceCents: 4300 },
  { slug: "mountain-radio-tee", title: "Mountain Radio Tee", top: "TUNED TO THE TREES", center: "FM 38.8", bottom: "MOUNTAIN RADIO / 1975", palette: "ocean", printMethod: "DTG", priceCents: 4800 },
  { slug: "flower-market-tee", title: "Flower Market Tee", top: "FRESH CUT DAILY", center: "FLOWER MARKET", bottom: "BLOOM WHERE YOU LAND", palette: "brick", printMethod: "DTG", priceCents: 4900 },
  { slug: "weekend-mechanic-tee", title: "Weekend Mechanic Tee", top: "WEEKEND WRENCHING", center: "FIX IT 38", bottom: "GARAGE DEPT. / 1983", palette: "gold", printMethod: "DTF", priceCents: 4600 },
  { slug: "rain-check-tee", title: "Rain Check Tee", top: "CLOUDS CAN WAIT", center: "RAIN CHECK", bottom: "WEATHER SERVICE / 1970", palette: "ocean", printMethod: "DTG", priceCents: 4500 },
  { slug: "county-fair-tee", title: "County Fair Tee", top: "ONE MORE RIDE", center: "COUNTY 38", bottom: "GAMES / RIDES / LATE NIGHTS", palette: "brick", printMethod: "DTF", priceCents: 4700 },
  { slug: "open-road-tee", title: "Open Road Tee", top: "NO MAP REQUIRED", center: "OPEN ROAD", bottom: "MOTOR TOURING / 1978", palette: "gold", printMethod: "DTG", priceCents: 4800 },
  { slug: "canyon-outpost-tee", title: "Canyon Outpost Tee", top: "SUPPLIES FOR THE WAY OUT", center: "OUTPOST 38", bottom: "CANYON COUNTRY / 1965", palette: "sage", printMethod: "DTF", priceCents: 4800 },
  { slug: "soul-club-tee", title: "Soul Club Tee", top: "ALL VINYL / ALL NIGHT", center: "SOUL CLUB", bottom: "DANCE FLOOR DIVISION / 1976", palette: "brick", printMethod: "DTG", priceCents: 4600 },
  { slug: "harvest-moon-tee", title: "Harvest Moon Tee", top: "GATHER AFTER DARK", center: "HARVEST MOON", bottom: "AUTUMN SOCIAL / EST. 1973", palette: "gold", printMethod: "DTG", priceCents: 4900 },
  { slug: "summit-post-tee", title: "Summit Post Tee", top: "EARN THE VIEW", center: "SUMMIT 38", bottom: "ALTITUDE CLUB / 1986", palette: "ocean", printMethod: "DTF", priceCents: 4700 },
  { slug: "corner-store-tee", title: "Corner Store Tee", top: "YOUR USUAL / RIGHT HERE", center: "CORNER 38", bottom: "COLD DRINKS / GOOD PEOPLE", palette: "sage", printMethod: "DTG", priceCents: 4300 },
  { slug: "desert-flower-tee", title: "Desert Flower Tee", top: "ROOTED / NOT RUSHED", center: "DESERT FLOWER", bottom: "NATIVE PLANT SOCIETY / 1980", palette: "brick", printMethod: "DTG", priceCents: 4900 },
  { slug: "long-weekend-tee", title: "Long Weekend Tee", top: "OUT OF OFFICE", center: "LONG WEEKEND", bottom: "BACK WHEN WE FEEL LIKE IT", palette: "ocean", printMethod: "DTF", priceCents: 4400 },
  { slug: "city-garden-tee", title: "City Garden Tee", top: "GROW THROUGH IT", center: "CITY GARDEN", bottom: "COMMUNITY PLOT / EST. 1977", palette: "sage", printMethod: "DTG", priceCents: 4800 },
  { slug: "foundry-athletic-tee", title: "Foundry Athletic Tee", top: "BUILT FROM THE GROUND UP", center: "FOUNDRY", bottom: "ATHLETIC UNION / 1982", palette: "ink", printMethod: "DTF", priceCents: 4500 },
  { slug: "twilight-swim-tee", title: "Twilight Swim Tee", top: "LAST ONE IN", center: "TWILIGHT SWIM", bottom: "BATHING CLUB / 1974", palette: "ocean", printMethod: "DTG", priceCents: 4600 },
  { slug: "sunrise-delivery-tee", title: "Sunrise Delivery Tee", top: "BEFORE THE CITY WAKES", center: "SUNRISE CO.", bottom: "EARLY ROUTE / 38 MILES", palette: "gold", printMethod: "DTF", priceCents: 4500 },
  { slug: "desert-sound-tee", title: "Desert Sound Tee", top: "AMPLIFIERS IN THE SAND", center: "DESERT SOUND", bottom: "LIVE SESSION / 1981", palette: "brick", printMethod: "DTG", priceCents: 4900 },
  { slug: "last-stop-tee", title: "Last Stop Tee", top: "END OF THE LINE", center: "LAST STOP", bottom: "RAILWAY SOCIAL CLUB / 1967", palette: "ink", printMethod: "DTF", priceCents: 4700 },
];