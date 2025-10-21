const fs = require('fs');
const path = require('path');

// Gmail Add-on manifest (appsscript.json)
const gmailManifest = {
  "timeZone": "America/New_York",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Gmail",
        "serviceId": "gmail",
        "version": "v1"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify"
  ]
};

const distPath = path.join(__dirname, '..', 'dist');
const manifestPath = path.join(distPath, 'appsscript.json');

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Write Gmail manifest
fs.writeFileSync(manifestPath, JSON.stringify(gmailManifest, null, 2));

console.log('Gmail manifest created in dist/');
