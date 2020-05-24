module.exports = {
  env: {
    commonjs: true,
    es6: true,
    es2020: true,
    jest: true,
  },
  extends: ['standard'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'comma-dangle': 0,
    'no-unused-vars': 0,
    indent: 0,
  },
}
