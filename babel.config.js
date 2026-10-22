module.exports = function (api) {
  api.cache(false);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
    overrides: [
      {
        // Only rewrite the app's own imports. With `root: ["./"]` the resolver
        // also turns a library's `require(".")` (expo-router 56) into a path to
        // this project's root. A function rather than a RegExp, because Expo
        // also loads this config without a filename.
        exclude: (filename) => /[\\/]node_modules[\\/]/.test(filename ?? ""),
        plugins: [
          [
            "module-resolver",
            {
              root: ["./"],
              alias: {
                "@": "./src",
                "@env": "./src/core/env.js",
              },
              extensions: [
                ".ios.ts",
                ".android.ts",
                ".ts",
                ".ios.tsx",
                ".android.tsx",
                ".tsx",
                ".jsx",
                ".js",
                ".json",
              ],
            },
          ],
        ],
      },
    ],
  };
};
