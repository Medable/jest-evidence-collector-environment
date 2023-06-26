import fs from 'fs'
import path from 'path'
import { Collector } from './collector'
import { EnvOptions, TestCase, Evidence, OutputResult } from './types'
import { getMicroTime } from './utils'

describe('Collector', () => {
  
  jest.mock('fs')
  // hijack singleton implementation for testing
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  jest.spyOn(Collector as unknown as any, 'alreadyCreated').mockImplementation(() => {
    return false
  })


  let collector: Collector
  let options: EnvOptions

  beforeEach(() => {
    options = {
      enabled: true,
      project: 'ABC',
      header: 'Test Header',
      output: {
        folder: 'outputFolder',
        file: 'outputFile.json',
      },
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance of Collector', () => {
      collector = Collector.getInstance(options)
      expect(collector).toBeInstanceOf(Collector)
    })

    it('should initialize allEvidence as an empty map', () => {
      collector = Collector.getInstance(options)
      expect(collector['allEvidence']).toBeInstanceOf(Map)
      expect(collector['allEvidence'].size).toBe(0)
    })

    it('should create the output file if it does not exist', () => {
      const folderExistsSpy = jest
        .spyOn(fs, 'existsSync')
        .mockReturnValue(false)
      const folderMkdirSpy = jest.spyOn(fs, 'mkdirSync')
      const fileExistsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false)
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

      collector = Collector.getInstance(options)

      expect(folderExistsSpy).toHaveBeenCalledWith(
        options.output.folder,
      )
      expect(folderMkdirSpy).toHaveBeenCalledWith(
        options.output.folder,
        { recursive: true },
      )
      expect(fileExistsSpy).toHaveBeenCalledWith(
        path.join(options.output.folder, options.output.file),
      )
      expect(writeFileSpy).toHaveBeenCalledWith(
        path.join(options.output.folder, options.output.file),
        expect.any(String),
        'utf-8',
      )
    })

    it('should not create the output file if it already exists', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true)
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

      collector = Collector.getInstance(options)

      expect(writeFileSpy).not.toHaveBeenCalled()
    })
  })

  describe('extractTestCase', () => {
    it('should extract the test case name when project and name are provided', () => {
      collector = Collector.getInstance(options)
      const name = 'ABC-TestCase1'
      const testCase = collector.extractTestCase(name)
      expect(testCase).toBe('ABC-TestCase1')
    })

    it('should return null when project or name are missing', () => {
      collector = Collector.getInstance(options)
      const testCase1 = collector.extractTestCase(undefined)
      const testCase2 = collector.extractTestCase('TestCase1')
      expect(testCase1).toBeNull()
      expect(testCase2).toBeNull()
    })
  })

  describe('addTestCase', () => {
    it('should add a new test case to allEvidence if it does not exist', () => {
      collector = Collector.getInstance(options)
      const test: TestCase = {
        identifier: 'TestCase1',
        status: 'Passed',
        evidence: [],
        started: new Date(),
      }
      collector.addTestCase(test)
      const testCase = collector.getTestCase('TestCase1')
      expect(testCase).toEqual(test)
    })

    it('should not add a new test case to allEvidence if it already exists', () => {
      collector = Collector.getInstance(options)
      const test: TestCase = {
        identifier: 'TestCase1',
        status: 'Passed',
        evidence: [],
        started: new Date(),
      }
      collector.addTestCase(test)
      const newTest: TestCase = {
        identifier: 'TestCase1',
        status: 'Failed',
        evidence: [],
        started: new Date(),
      }
      collector.addTestCase(newTest)
      const testCase = collector.getTestCase('TestCase1')
      expect(testCase).toEqual(test)
    })
  })

  describe('addEvidence', () => {
    it('should add evidence to a test case', () => {
      collector = Collector.getInstance(options)
      const test: TestCase = {
        identifier: 'TestCase1',
        status: 'Passed',
        evidence: [],
        started: new Date(),
      }
      collector.addTestCase(test)

      const evidence: Evidence = {
        identifier: 'TestCase1',
        description: 'Evidence 1',
        collectedAt: getMicroTime(),
        data: { foo: 'bar' },
      }
      collector.addEvidence(test, evidence)

      const testCase = collector.getTestCase('TestCase1')
      expect(testCase?.evidence).toContainEqual(evidence)
    })
  })

  describe('updateTestStatus', () => {
    it('should update the status of a test case', () => {
      collector = Collector.getInstance(options)
      const test: TestCase = {
        identifier: 'TestCase1',
        status: 'Passed',
        evidence: [],
        started: new Date(),
      }
      collector.addTestCase(test)

      collector.updateTestStatus('TestCase1', 'Failed')

      const testCase = collector.getTestCase('TestCase1')
      expect(testCase?.status).toBe('Failed')
    })

    it('should log a warning if the test case is missing', () => {
      collector = Collector.getInstance(options)
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      collector.updateTestStatus('TestCase1', 'Passed')

      expect(consoleWarnSpy).toHaveBeenCalledWith('Missing test case!')
    })
  })

  describe('endCollecting', () => {
    it('should write the final output file if enabled and evidence exists', () => {
      collector = Collector.getInstance(options)
      const fileContent: OutputResult = {
        title: 'Test Title',
        tests: [],
      }
      const readFileSpy = jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(JSON.stringify(fileContent))
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

      const test: TestCase = {
        identifier: 'TestCase1',
        status: 'Passed',
        started: new Date(),
        evidence: [
          {
            identifier: 'TestCase1',
            description: 'Evidence 1',
            collectedAt: getMicroTime(),
            data: { foo: 'bar' },
          },
        ],
      }
      collector.addTestCase(test)

      collector.endCollecting()

      expect(readFileSpy).toHaveBeenCalledWith(
        path.join(options.output.folder, options.output.file),
        { encoding: 'utf-8' },
      )
      expect(writeFileSpy).toHaveBeenCalled()
      expect(collector['allEvidence'].size).toBe(0)
    })

    it('should not write the final output file if enabled is false', () => {
      
      options.enabled = false
      collector = Collector.getInstance(options)
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

      const test: TestCase = {
        identifier: 'TestCase1',
        status: 'Passed',
        started: new Date(),
        evidence: [
          {
            identifier: 'TestCase1',
            description: 'Evidence 1',
            collectedAt: getMicroTime(),
            data: { foo: 'bar' },
          },
        ],
      }
      collector.addTestCase(test)

      collector.endCollecting()

      expect(writeFileSpy).not.toHaveBeenCalled()
      expect(collector['allEvidence'].size).toBe(0)
    })

    it('should not write the final output file if no evidence exists', () => {
      collector = Collector.getInstance(options)
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

      collector.endCollecting()

      expect(writeFileSpy).not.toHaveBeenCalled()
      expect(collector['allEvidence'].size).toBe(0)
    })
  })
})
