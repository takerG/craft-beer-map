const experiment = require('../generated/experiment.js');

module.exports = experiment.recommendationContract === 'semantic-v2'
  ? require('./recommendBeerStylesCandidate.js')
  : require('./recommendBeerStylesControl.js');
