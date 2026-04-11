import coreWebVitalsConfig from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitalsConfig,
  ...typescriptConfig,
  { ignores: ['.next/*', 'prisma/client/*', '.claude/*'] },
];

export default eslintConfig;
