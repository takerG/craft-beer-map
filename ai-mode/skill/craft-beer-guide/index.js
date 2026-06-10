const searchBeerStyles = require('./apis/searchBeerStyles.js');
const recommendBeerStyles = require('./apis/recommendBeerStyles.js');
const getBeerStyleDetail = require('./apis/getBeerStyleDetail.js');
const listFavoriteBeerStyles = require('./apis/listFavoriteBeerStyles.js');
const addFavoriteBeerStyle = require('./apis/addFavoriteBeerStyle.js');
const removeFavoriteBeerStyle = require('./apis/removeFavoriteBeerStyle.js');
const findAcademyArticles = require('./apis/findAcademyArticles.js');

const skill = wx.modelContext.createSkill('skills/craft-beer-guide');

skill.registerAPI('searchBeerStyles', searchBeerStyles);
skill.registerAPI('recommendBeerStyles', recommendBeerStyles);
skill.registerAPI('getBeerStyleDetail', getBeerStyleDetail);
skill.registerAPI('listFavoriteBeerStyles', listFavoriteBeerStyles);
skill.registerAPI('addFavoriteBeerStyle', addFavoriteBeerStyle);
skill.registerAPI('removeFavoriteBeerStyle', removeFavoriteBeerStyle);
skill.registerAPI('findAcademyArticles', findAcademyArticles);
