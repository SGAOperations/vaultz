import nextConfig from 'eslint-config-next';
import nextTypescriptConfig from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextConfig,
  ...nextTypescriptConfig,
  { ignores: ['.next/*', 'prisma/client/*'] },
];

export default eslintConfig;
