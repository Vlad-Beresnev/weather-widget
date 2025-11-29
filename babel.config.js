export default {
  presets: [
    ['@babel/preset-env', {
      targets: { browsers: ['>0.25%', 'not dead'] },
      useBuiltIns: 'usage',
      corejs: 3
    }],
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    ['@babel/plugin-transform-runtime', { corejs: 3, helpers: true, regenerator: true, useESModules: false }]
  ]
};