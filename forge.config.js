const path = require('path');
const fse = require('fs-extra');
const gp = require('./src/get-platform');
const AppRootDir = require('app-root-dir');
require('dotenv').config()

module.exports = {
  packagerConfig: {
    appBundleId: 'dev.hmiller.taisho',
    icon: "icons/urbit-logo",
    osxSign: {
      identity: 'Developer ID Application: Hunter Miller (8YA38DLJ3T)',
      "entitlements": "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
      'hardened-runtime': true,
      'gatekeeper-assess': false,
      'signature-flags': 'library'
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      ascProvider: '8YA38DLJ3T'
    }
  },
  hooks: {
    packageAfterCopy: (forgeConfig, buildPath, electronVersion, platform) => {
      const os = gp.getPlatform(platform)
      fse.copySync(path.join(AppRootDir.get(), 'resources', os), path.resolve(buildPath, ...gp.getPlatformPathSegments(os), 'resources', os), {
        filter: (src) => !src.includes('.gitignore')
      })
      console.log({ platform, os })
    }
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "taisho"
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: "taisho",
        icon: "icons/urbit-logo.icns"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin",
        "linux"
      ]
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        icon: "icons/urbit-logo.png"
      }
    }
  ],
  plugins: [
    [
      "@electron-forge/plugin-webpack",
      {
        mainConfig: "./src/main/webpack.main.config.js",
        renderer: {
          config: "./src/renderer/webpack.renderer.config.js",
          entryPoints: [
            {
              name: "main_window",
              html: "./src/renderer/index.html",
              js: "./src/renderer/renderer.tsx",
              preload: {
                js: "./src/renderer/client/preload.ts"
              }
            },
            {
              html: "./src/background/server/server.html",
              js: "./src/background/main.ts",
              name: "background_window"
            }
          ]
        }
      }
    ]
  ]
}