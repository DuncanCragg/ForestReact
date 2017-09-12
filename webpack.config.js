const path = require('path');

module.exports = {
  entry: './lib/todomvc/evaluatetodo.js',
  output: {
    filename: 'todobundle.js',
    path: path.resolve(__dirname, 'lib')
  }
};
