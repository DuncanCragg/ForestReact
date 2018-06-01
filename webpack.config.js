const path = require('path');

module.exports = {
  entry: {
    todo: './lib/todomvc/evaluatetodo.js',
    fed: './lib/evaluatefed.js',
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name]bundle.js',
  }
};
