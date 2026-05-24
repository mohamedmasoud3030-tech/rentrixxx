import js from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/accountingDocuments/*', '@/services/documents/*', '@/services/reports/*'],
              message: 'Import from the domain barrel only (e.g., @/services/<domain>).',
            },
          ],
        },
      ],
    },
  },
];
