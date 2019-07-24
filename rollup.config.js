import babel from 'rollup-plugin-babel'

export default {
  input: './src/index.js',
  output: {
    format: 'cjs',
    file: 'dist/index.js'
  },
  external: [
    '@babel/runtime/regenerator',
    '@babel/runtime/helpers/toConsumableArray',
    '@babel/runtime/helpers/typeof',
    '@babel/runtime/helpers/asyncToGenerator',
    'pify',
    'resolve',
    'sass',
    'path',
    'fs',
    'rollup-pluginutils',
    'fs-extra'
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**',
      runtimeHelpers: true
    })
  ]
}
