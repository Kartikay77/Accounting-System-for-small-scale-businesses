module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      'REACT/**',
      'AJAX/**',
      'public/**',
      'media/**',
      'views/**'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error'
    }
  }
];
