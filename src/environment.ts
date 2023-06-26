
import NodeEnvironment from 'jest-environment-node'
import type { Circus } from '@jest/types'
import { JestEnvironmentConfig, EnvironmentContext } from '@jest/environment'
import { EnvOptions, Evidence, EvidenceTypeEnum, TestCase } from './types'
import { Collector } from './collector'
import { getMicroTime } from './utils'


export default class CustomEnvironment extends NodeEnvironment {
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
        defaultType: EvidenceTypeEnum.IMAGE,
        output: {
          folder: './evidence',
          file: 'results.json',
        },
      },
      ...testEnvironmentOptions,
    } as EnvOptions
    this.collector = Collector.getInstance(options)
    this.global.collectEvidence = this.collectEvidence.bind(this)
    
  }

  collectEvidence(description: string, data: string | Buffer | string[] | object, identifier?:string): void;
  collectEvidence(description: string, data: string | Buffer | string[] | object, type?: EvidenceTypeEnum, identifier?:string): void {
    const tc = this.collector.getTestCase(this.testId)
    if(tc) {
      const collectedAt = getMicroTime()
      this.collector.addEvidence(tc, { description, data, collectedAt, type, identifier } as Evidence)
    }
  }

  startTest(state: Circus.State) {
    const name = this.collector.extractTestCase(state.currentlyRunningTest?.name) || ''
    if (!name) {
      return console.warn(
        `Test: ${state.currentlyRunningTest?.name} will be ignored for evidence collection missing test case name.`,
      )
    }
   
    const hasMultiple = name.split(',').length > 1
    const tc = {
      multipleIdentifiers: hasMultiple,
      identifier: name,
      started: new Date(
        (state.currentlyRunningTest?.startedAt as unknown) as number,
      ),
    } as TestCase
   
    this.testId = name
    this.collector.addTestCase(tc)
  }

  endTest(state: Circus.State, success: boolean) {
    const status = success ? 'Passed' : 'Failed'
    if (state.currentlyRunningTest?.errors?.length) {
      this.collectEvidence('Error executing test', state.currentlyRunningTest.errors, this.testId)
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
