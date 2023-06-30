
import NodeEnvironment from 'jest-environment-node'
import type { Circus } from '@jest/types'
import { JestEnvironmentConfig, EnvironmentContext } from '@jest/environment'
import { EnvOptions, Evidence, EvidenceError, EvidenceTypeEnum, TestCase } from './types'
import { Collector } from './collector'
import { getMicroTime } from './utils'


export class CustomEnvironment extends NodeEnvironment {
  testPath?: string
  docblockPragmas?: Record<string, string | string[]>
  collector: Collector
  testId!: string


  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context)
    const {
      projectConfig: { testEnvironmentOptions },
    } = config
    this.docblockPragmas = context?.docblockPragmas
    this.testPath = context?.testPath
    const options = {
      ...{
        enabled: true,
        output: {
          folder: './evidence',
          file: 'results.json',
        },
      },
      ...testEnvironmentOptions,
    } as EnvOptions
    this.collector = Collector.getInstance(options)
    const collectAsImage = this.collectAsImage.bind(this)
    const collectAsText = this.collectAsText.bind(this)
    const collectError = this.collectError.bind(this)
    this.global.collectAsText = collectAsText
    this.global.collectAsImage = collectAsImage
    this.global.collectError =collectError
    
  }

  collectAsText(description: string, data: any, identifier?:string): void {
    const tc = this.collector.getTestCase(this.testId)
    if(tc) {
      const collectedAt = getMicroTime()
      const evidence = new Evidence({ description, data, collectedAt, type: EvidenceTypeEnum.TEXT, identifier } )
      this.collector.addEvidence(tc, evidence)
    }
  }
  collectAsImage(description: string, data: any, identifier?:string): void {
    const tc = this.collector.getTestCase(this.testId)
    if(tc) {
      const collectedAt = getMicroTime()
      const evidence = new Evidence({ description, data, collectedAt, type: EvidenceTypeEnum.IMAGE, identifier })
      this.collector.addEvidence(tc, evidence)
    }
  }
  collectError(error: Error, identifier?: string) {
    const tc = this.collector.getTestCase(this.testId)
    if(tc) {
      const collectedAt = getMicroTime()
      const evidenceError = new EvidenceError({ message: error.message, stack: error.stack, collectedAt, identifier })
      this.collector.addEvidence(tc, evidenceError)
    }
  }

  startTest(state: Circus.State) {
    const name = this.collector.extractTestCase(state.currentlyRunningTest?.name) || ''
    if (!name || name.length < 1) {
      return console.warn(
        `Test: ${state.currentlyRunningTest?.name} will be ignored for evidence collection missing test case name.`,
      )
    }
   
    const hasMultiple = name.length > 1
    const tc = {
      multipleIdentifiers: hasMultiple,
      identifier: name.join(','),
      started: new Date(
        (state.currentlyRunningTest?.startedAt as unknown) as number,
      ),
    } as TestCase
   
    this.testId = name.join(',')
    this.collector.addTestCase(tc)
  }

  endTest(state: Circus.State, success: boolean) {
    const status = success ? 'Passed' : 'Failed'
    if (state.currentlyRunningTest?.errors?.length) {
      const err = new Error('Error executing test')
      err.stack = JSON.stringify(state.currentlyRunningTest.errors, null, 2)
      this.collectError(err, this.testId)
    }
    this.collector.updateTestStatus(this.testId, status)
    
  }

  finish() {
    this.collector.endCollecting()
  }

  handleTestEvent(event: Circus.Event, state: Circus.State) {
    switch (event.name) {
      case 'setup':
        break
      case 'test_fn_start':
        this.startTest(state)
        break
      case 'test_fn_success':
        this.endTest(state, true)
        break
      case 'test_fn_failure':
        this.endTest(state, false)
        break
      case 'teardown':
        this.finish()
        break
      case 'error':
        this.finish()
        break
      default:
        break
    }
  }
}
