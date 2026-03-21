/**
 * Static map of country name → flag image require().
 * React Native requires static require() calls, so we enumerate them here.
 * The key should match the team `id` field in the game data.
 */
const flagMap: Record<string, any> = {
  Argentina: require('./Argentina.png'),
  Australia: require('./Australia.png'),
  Austria: require('./Austria.png'),
  Belgium: require('./Belgium.png'),
  Brazil: require('./Brazil.png'),
  Canada: require('./Canada.png'),
  Chile: require('./Chile.png'),
  China: require('./China.png'),
  Colombia: require('./Colombia.png'),
  Croatia: require('./Croatia.png'),
  Cuba: require('./Cuba.png'),
  Czechia: require('./Czechia.png'),
  Denmark: require('./Denmark.png'),
  Egypt: require('./Egypt.png'),
  Finland: require('./Finland.png'),
  France: require('./France.png'),
  Germany: require('./Germany.png'),
  Greece: require('./Greece.png'),
  Hungary: require('./Hungary.png'),
  Italy: require('./Italy.png'),
  Japan: require('./Japan.png'),
  Latvia: require('./Latvia.png'),
  Mexico: require('./Mexico.png'),
  Morocco: require('./Morocco.png'),
  Netherlands: require('./Netherlands.png'),
  Norway: require('./Norway.png'),
  Poland: require('./Poland.png'),
  Portugal: require('./Portugal.png'),
  Qatar: require('./Qatar.png'),
  Russia: require('./Russia.png'),
  SouthAfrica: require('./SouthAfrica.png'),
  Spain: require('./Spain.png'),
  Sweden: require('./Sweden.png'),
  Switzerland: require('./Switzerland.png'),
  Turkey: require('./Turkey.png'),
  Ukraine: require('./Ukraine.png'),
  UnitedKingdom: require('./UnitedKingdom.png'),
  UnitedStates: require('./UnitedStates.png'),
  Uruguay: require('./Uruguay.png'),
  Venezuela: require('./Venezuela.png'),
  Vietnam: require('./Vietnam.png'),
};

export default flagMap;

