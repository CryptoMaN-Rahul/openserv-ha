/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest'
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
