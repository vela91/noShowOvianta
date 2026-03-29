import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components — nuevo modelo de caché en NextJS 16
  // Ref: https://nextjs.org/blog/next-16#cache-components
  cacheComponents: true,

  // React Compiler — memoización automática (useMemo/useCallback automáticos)
  // Ref: https://nextjs.org/blog/next-16#react-compiler-support-stable
  reactCompiler: true,
};

export default nextConfig;
