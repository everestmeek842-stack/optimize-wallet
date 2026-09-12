const fs=require('fs');
const pkg={
  "name": "nellystv-executive-superapp",
  "version": "1.0.0",
  "private": true,
  "description": "Executive Web3 Super-App & NELLY'S TV Hub",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "server": "node server.js",
    "dev": "node server.js",
    "build": "node build-verification.js",
    "build:vercel": "echo 'No build required - static files only'",
    "build:render": "npm install",
    "verify": "node deployment-verification.js",
    "verify:deployment": "node deployment-verification.js",
    "build:android": "cd android && gradlew assembleRelease",
    "build:windows": "electron-builder build --win --publish never",
    "explorer": "npm start",
    "clean": "rimraf node_modules package-lock.json && npm install",
    "prestart": "node -e \"console.log('Starting Nexus Platform...')\""
  },
  "author": "SREYMARA & KANSAS",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^8.7.0",
    "http-proxy-middleware": "^4.2.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "electron-packager": "^17.1.2",
    "rimraf": "^5.0.0"
  },
  "build": {
    "appId": "com.sreymara.nellystv",
    "productName": "NELLY'S TV Executive SuperApp",
    "directories": {
      "output": "build_outputs/windows"
    },
    "win": {
      "icon": "icon.ico",
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "keywords": ["nexus","nellystv","web3","superapp","wallet","cinema","telegram"],
  "repository": {
    "type": "git",
    "url": "https://github.com/everestmeek842-stack/optimize-wallet.git"
  },
  "homepage": "https://nexus-platform-web-five.vercel.app"
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json updated');
