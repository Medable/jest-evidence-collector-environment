const { runCLI } = require('jest')
const path = require('path')
const fs = require('fs')

describe('Testing end to end environment implementation', () => {
  let testResult
  const projectPath = path.join(__dirname, 'e2e')
  const options = {
    silent: true,
    verbose: false,
    reporters: ['jest-silent-reporter'],
    config: path.join(__dirname, 'e2e', 'jest.config.js'),
  }

  beforeAll(async () => {
    testResult = await runCLI(options, [projectPath])
    expect(testResult).toBeDefined()
  })

  it('should run all test', async () => {
    const {
      numFailedTests,
      numPassedTests,
      numTotalTestSuites,
      numTotalTests,
    } = testResult.results
    expect(numFailedTests).toBe(1)
    expect(numPassedTests).toBe(3)
    expect(numTotalTestSuites).toBe(2)
    expect(numTotalTests).toBe(4)
  })

  it('should have generated the proper evidence', async () => {
    const results = JSON.parse(fs.readFileSync(path.join(__dirname, 'e2e/evidence/results.json'), { encoding: 'utf-8' }))
    expect(results.title).toContain('My Header Test Run')
    expect(results.tests.length).toBe(5)
    const ids = new Set(results.tests.map(t => t.id))
    expect(ids.size).toBe(5)
    const images = results.tests.map(t => t.evidence.map(e => e.image)).flat(2)
    expect(images.length).toBe(8)
    for(const img of images) {
      expect(fs.existsSync(img)).toBeTruthy()
    }
  })
})
