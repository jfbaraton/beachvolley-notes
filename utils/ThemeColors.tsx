const BAD = 68;
const PASSABLE = 80;
const DELTA_BAD = -0.1; //10% regression is a bad Delta
const DELTA_PASSABLE = 0.05; // 5% progression is a good delta

// used for Liquid Gauges
// different colors depending on 0-100 number displayed
export const getCircleColorForSuccess = (value, isDelta) => {
    if(!value || value < (isDelta ? DELTA_BAD: BAD)) return '#FF7777';
    if(value < (isDelta ? DELTA_PASSABLE: PASSABLE)) return 'mediumseagreen';
    return 'darkgoldenrod';
};
export const getWaveColorForSuccess = (value, isDelta) => {
    if(!value || value < (isDelta ? DELTA_BAD: BAD)) return '#FFDDDD';
    if(value < (isDelta ? DELTA_PASSABLE: PASSABLE)) return '#246D5F';
    return 'darkcyan';
};
export const getTextColorForSuccess = (value, isDelta) => {
    if(!value || value < (isDelta ? DELTA_BAD: BAD)) return '#FF4444';
    if(value < (isDelta ? DELTA_PASSABLE: PASSABLE)) return '#0E5144';
    return 'gold';
};
export const getWaveTextColorForSuccess = (value, isDelta) => {
    if(!value || value < (isDelta ? DELTA_BAD: BAD)) return '#FFAAAA';
    if(value < (isDelta ? DELTA_PASSABLE: PASSABLE)) return 'mediumseagreen';
    return 'darkgoldenrod';
};