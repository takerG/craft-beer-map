const fs = require('fs');
const path = require('path');

const p1 = require('./generate_bjcp_part1.json');
const p2 = require('./generate_bjcp_part2.json');
const p3 = require('./generate_bjcp_part3.json');

const categories = [
  { id: '1', name_zh: '标准美国啤酒', name_en: 'Standard American Beer' },
  { id: '2', name_zh: '国际拉格', name_en: 'International Lager' },
  { id: '3', name_zh: '捷克拉格', name_en: 'Czech Lager' },
  { id: '4', name_zh: '淡色麦香型欧洲拉格', name_en: 'Pale Malty European Lager' },
  { id: '5', name_zh: '淡色苦味欧洲啤酒', name_en: 'Pale Bitter European Beer' },
  { id: '6', name_zh: '琥珀色麦香型欧洲拉格', name_en: 'Amber Malty European Lager' },
  { id: '7', name_zh: '琥珀色苦味欧洲啤酒', name_en: 'Amber Bitter European Beer' },
  { id: '8', name_zh: '深色欧洲拉格', name_en: 'Dark European Lager' },
  { id: '9', name_zh: '烈性欧洲啤酒', name_en: 'Strong European Beer' },
  { id: '10', name_zh: '德国小麦啤酒', name_en: 'German Wheat Beer' },
  { id: '11', name_zh: '英国苦味啤酒', name_en: 'British Bitter' },
  { id: '12', name_zh: '淡色公国啤酒', name_en: 'Pale Commonwealth Beer' },
  { id: '13', name_zh: '棕色英国啤酒', name_en: 'Brown British Beer' },
  { id: '14', name_zh: '苏格兰爱尔', name_en: 'Scottish Ale' },
  { id: '15', name_zh: '爱尔兰啤酒', name_en: 'Irish Beer' },
  { id: '16', name_zh: '深色英国啤酒', name_en: 'Dark British Beer' },
  { id: '17', name_zh: '烈性英国爱尔', name_en: 'Strong British Ale' },
  { id: '18', name_zh: '淡色美国爱尔', name_en: 'Pale American Ale' },
  { id: '19', name_zh: '琥珀色美国啤酒', name_en: 'Amber and Brown American Beer' },
  { id: '20', name_zh: '美国波特与世涛', name_en: 'American Porter and Stout' },
  { id: '21', name_zh: 'IPA', name_en: 'IPA' },
  { id: '22', name_zh: '烈性美国啤酒', name_en: 'Strong American Ale' },
  { id: '23', name_zh: '欧洲酸啤酒', name_en: 'European Sour Ale' },
  { id: '24', name_zh: '比利时爱尔', name_en: 'Belgian Ale' },
  { id: '25', name_zh: '烈性比利时爱尔', name_en: 'Strong Belgian Ale' },
  { id: '26', name_zh: '修道院爱尔', name_en: 'Trappist Ale' },
  { id: '27', name_zh: '历史啤酒', name_en: 'Historical Beer' },
  { id: '28', name_zh: '美式野生爱尔', name_en: 'American Wild Ale' },
  { id: '29', name_zh: '水果啤酒', name_en: 'Fruit Beer' },
  { id: '30', name_zh: '香料草本类啤酒', name_en: 'Spiced Beer' },
  { id: '31', name_zh: '替代型谷物和糖类添加型啤酒', name_en: 'Alternative Fermentables Beer' },
  { id: '32', name_zh: '烟熏啤酒', name_en: 'Smoked Beer' },
  { id: '33', name_zh: '木材熟成啤酒', name_en: 'Wood-Aged Beer' },
  { id: '34', name_zh: '特种啤酒', name_en: 'Specialty Beer' }
];

const styles = [...p1, ...p2, ...p3];

const relations = [
  { source: '1B', target: '1A', type: 'related' },
  { source: '2A', target: '1B', type: 'influenced_by' },
  { source: '3B', target: '3A', type: 'related' },
  { source: '5A', target: '3B', type: 'influenced_by' },
  { source: '5B', target: '5A', type: 'compared_to' },
  { source: '6B', target: '6A', type: 'related' },
  { source: '4A', target: '5A', type: 'compared_to' },
  { source: '8A', target: '4A', type: 'related' },
  { source: '9A', target: '8A', type: 'influenced_by' },
  { source: '10A', target: '10B', type: 'related' },
  { source: '12C', target: '11B', type: 'influenced_by' },
  { source: '15B', target: '20B', type: 'compared_to' },
  { source: '18B', target: '11B', type: 'influenced_by' },
  { source: '18B', target: '21A', type: 'influenced' },
  { source: '21A', target: '12C', type: 'influenced_by' },
  { source: '21C', target: '21A', type: 'influenced_by' },
  { source: '22A', target: '21A', type: 'influenced_by' },
  { source: '20C', target: '17D', type: 'influenced_by' },
  { source: '24A', target: '10A', type: 'compared_to' },
  { source: '26B', target: '26C', type: 'related' },
  { source: '26D', target: '26B', type: 'influenced_by' },
  { source: '23E', target: '23D', type: 'influenced_by' },
  { source: '23A', target: '10A', type: 'compared_to' },
  { source: '25B', target: '24C', type: 'compared_to' },
  { source: '27A', target: '5A', type: 'compared_to' },
];

fs.writeFileSync(
  path.join(__dirname, 'public', 'data.json'),
  JSON.stringify({ categories, styles, relations }, null, 2)
);

console.log('Successfully merged all parts to public/data.json (' + styles.length + ' styles)');
