const { runCLI } = require('jest')
const path = require('path')
const fs = require('fs')

describe('Testing end to end environment implementation', () => {
  let testResult
  const projectPath = path.join(__dirname, 'e2e')
  const options = {
    silent: false,
    verbose: true,
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
    expect(results.test_run_name).toContain('My Header Test Run')
    expect(results.tests.length).toBe(5)
    const ids = new Set(results.tests.map(t => t.id_list))
    expect(ids.size).toBe(5)
    const resources = results.tests.map(t => t.evidence.filter(e => e.type === 'jsonImage').map(e => e.resource)).flat(2)
    expect(resources.length).toBe(5)
    for(const res of resources) {
      expect(fs.existsSync(res)).toBeTruthy()
    }
  })
})
