const path = require('path')
const outputPath = path.join(__dirname, "evidence")
module.exports = {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": __dirname,
  "testEnvironment": "../../dist",
  "testEnvironmentOptions": {
    "project": "ABC",
    "header": "My Header",
    "output": {
      "folder": outputPath,
      "file": "results.json"
    }
  },
  "testRegex": ".test.js$"
}