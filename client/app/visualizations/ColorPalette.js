import { values } from 'lodash';

// The following colors will be used if you pick "Automatic" color
export const BaseColors = {
  Blue: '#02A4CE',
  Red: '#4596D8',
  Green: '#418ECE',
  Purple: '#66CBF6',
  Cyan: '#BCE3F8',
  Orange: '#DE3B84',
  'Light Blue': '#1B2668',
  Lilac: '#113A91',
  'Light Green': '#624EC2',
  'Dark Blue': '#0834CB',
};

// Additional colors for the user to choose from
export const AdditionalColors = {
  'Indian Red': '#981717',
  'Green 2': '#17BF51',
  'Green 3': '#049235',
  DarkTurquoise: '#00B6EB',
  'Dark Violet': '#A58AFF',
  'Pink 2': '#C63FA9',
};

export const ColorPaletteArray = values(BaseColors);
// ColorPaletteArrayWithTrans
export const ColorPaletteArrayWithTrans = values(BaseColors).map(item => colorRgb(item, 0.5));

function colorRgb(hColor, transparency) {
  let sColor = hColor.toLowerCase();
  // 十六进制颜色值的正则表达式
  const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  // 如果是16进制颜色
  if (sColor && reg.test(sColor)) {
    if (sColor.length === 4) {
      let sColorNew = '#';
      for (let i = 1; i < 4; i += 1) {
        sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
      }
      sColor = sColorNew;
    }
    // 处理六位的颜色值
    const sColorChange = [];
    for (let i = 1; i < 7; i += 2) {
      sColorChange.push(parseInt('0x' + sColor.slice(i, i + 2), 16));
    }
    return 'rgba(' + sColorChange.join(',') + ', ' + transparency + ')';
  }
  return sColor;
}

const ColorPalette = {
  ...BaseColors,
  ...AdditionalColors,
};

export default ColorPalette;
