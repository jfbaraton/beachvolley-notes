/**
 * Static map of country name → flag image require().
 * React Native requires static require() calls, so we enumerate them here.
 * The key should match the team `id` field in the game data.
 */
const flagMap: Record<string, any> = {
  Argentina: require('./Argentina.jpeg'),
  Australia: require('./Australia.jpeg'),
  Austria: require('./Austria.jpeg'),
  Belgium: require('./Belgium.png'),
  Brazil: require('./Brazil.png'),
  Canada: require('./Canada.jpeg'),
  Chile: require('./Chile.jpeg'),
  China: require('./China.png'),
  Colombia: require('./Colombia.png'),
  Croatia: require('./Croatia.png'),
  Cuba: require('./Cuba.jpeg'),
  Czechia: require('./Czechia.jpeg'),
  Denmark: require('./Denmark.png'),
  Egypt: require('./Egypt.png'),
  England: require('./England.jpeg'),
  Finland: require('./Finland.png'),
  France: require('./France.jpeg'),
  Germany: require('./Germany.jpeg'),
  Greece: require('./Greece.png'),
  Hungary: require('./Hungary.png'),
  Israel: require('./Israel.jpeg'),
  Italy: require('./Italy.jpeg'),
  Japan: require('./Japan.png'),
  Latvia: require('./Latvia.jpeg'),
  Mexico: require('./Mexico.png'),
  Morocco: require('./Morocco.png'),
  Netherlands: require('./Netherlands.jpeg'),
  Norway: require('./Norway.jpeg'),
  Poland: require('./Poland.jpeg'),
  Portugal: require('./Portugal.jpeg'),
  Qatar: require('./Qatar.jpeg'),
  Russia: require('./Russia.png'),
  SouthAfrica: require('./SouthAfrica.png'),
  Spain: require('./Spain.jpeg'),
  Sweden: require('./Sweden.jpeg'),
  Switzerland: require('./Switzerland.jpeg'),
  Turkey: require('./Turkey.png'),
  Ukraine: require('./Ukraine.jpeg'),
  UnitedKingdom: require('./UnitedKingdom.png'),
  UnitedStates: require('./UnitedStates.jpeg'),
  Uruguay: require('./Uruguay.png'),
  Venezuela: require('./Venezuela.png'),
  Vietnam: require('./Vietnam.png'),
};

export default flagMap;

