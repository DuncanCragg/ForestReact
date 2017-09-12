const path = require('path');

module.exports = {
  entry: './lib/evaluatefed.js',
  output: {
    filename: 'fedbundle.js',
    path: path.resolve(__dirname, 'lib')
  }
};
