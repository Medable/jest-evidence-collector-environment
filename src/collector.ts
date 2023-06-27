import fs from 'fs'
import path from 'path'
import { inspect } from 'util'
import { UltimateTextToImage, VerticalImage } from 'ultimate-text-to-image'
import {
  EnvOptions,
  Evidence,
  EvidenceError,
  EvidenceTypeEnum,
  OutputResult,
  TestCase,
} from './types'
import { getMicroTime } from './utils'
import * as uuid from 'uuid'
/**
 * The Collector is a singleton class that will be storing evidence until test executions finish
 */
export class Collector {
  id: string
  private static instance: Collector
  private allEvidence!: Map<string, TestCase>

  /**
   * The Collector's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor(private options: EnvOptions) {
    this.id = uuid.v4()
    this.allEvidence = new Map()
    if (this.options.enabled) {
      this.createOutputFile()
    }
  }

  private parseEvidence(title: string, tc: TestCase, identifier?: string) {
    const evidences = []
    const iterator = identifier
      ? tc.evidence.filter((e) => e.identifier && e.identifier === identifier)
      : tc.evidence

    for (const ev of iterator) {
      let fileName!: string
      const microTime = getMicroTime()
      if (ev.type === EvidenceTypeEnum.IMAGE) {
        fileName = `${identifier || tc.identifier}-dataImage-${microTime}.png`
        const ouputFilePath = path.join(this.options.output.folder, fileName)
        try {
          if (ev instanceof Evidence) {
            this.convertContentToImg(title, ev.data, false, ouputFilePath)
            delete ev.data
          } else {
            this.convertContentToImg(title, ev.stack, true, ouputFilePath)
          }
        } catch (ex) {
          console.log(ex)
        } finally {
          ev.resource = ouputFilePath
        }
      }

      evidences.push(ev)
    }
    return evidences
  }

  private createOutputFile() {
    if (!fs.existsSync(this.options.output.folder)) {
      fs.mkdirSync(this.options.output.folder, { recursive: true })
    }
    const ouputFilePath = path.join(
      this.options.output.folder,
      this.options.output.file,
    )
    if (!fs.existsSync(ouputFilePath)) {
      const fileContent: OutputResult = {
        test_run_name: `${
          this.options.header
        } Test Run: ${new Date().toISOString()}`.trim(),
        tests: [],
      }
      this.writeOutputFile(fileContent)
    }
  }

  private writeOutputFile(fileContent: OutputResult) {
    const ouputFilePath = path.join(
      this.options.output.folder,
      this.options.output.file,
    )
    fs.writeFileSync(
      ouputFilePath,
      JSON.stringify(fileContent, null, 2),
      'utf-8',
    )
  }

  private convertContentToImg(
    header: string,
    content: string,
    isError: boolean = false,
    ouputFilePath: string,
  ): void {
    const dataStr = !(typeof content === 'string') ? inspect(content) : content
    const titleImage = new UltimateTextToImage(`Test Cycle: ${header}`, {
      fontSize: 18,
      fontColor: isError ? '#FF0000' : '#000000',
      fontWeight: 700,
      width: 900,
      marginBottom: 20,
      maxHeight: 80,
    })
    const dataImage = new UltimateTextToImage(dataStr, {
      fontSize: 12,
      fontFamily: 'monospace',
      fontColor: isError ? '#FF0000' : '#000000',
      width: 900,
      borderSize: 1,
      borderColor: '#000000',
      backgroundColor: '#F0F0F0',
      margin: 10,
      maxHeight: 1024,
    })
    new VerticalImage([titleImage, dataImage], {
      backgroundColor: '#FFFFFF',
      margin: 20,
    })
      .render()
      .toFile(ouputFilePath, 'image/png', { compressionLevel: 9 })
  }

  private static alreadyCreated(): boolean {
    return !!Collector.instance
  }

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Collector class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(options: EnvOptions): Collector {
    if (!Collector.alreadyCreated()) {
      Collector.instance = new Collector(options)
    }

    return Collector.instance
  }

  public extractTestCase(name: string | undefined): string[] | null {
    if (this.options.project && name) {
      const pattern = this.options.regex || `${this.options.project}\\S+`
      const matches = name
        .match(new RegExp(pattern, 'ig'))
        ?.map((a) => a.toString().split(','))
        .flat(2)
      return matches?.filter((m) => m) || null
    }
    return null
  }

  public addTestCase(test: TestCase) {
    if (this.options.enabled && !this.allEvidence.has(test.identifier)) {
      test.evidence = []
      this.allEvidence.set(test.identifier, test)
    }
  }

  public getTestCase(identifier: string): TestCase | undefined {
    return this.allEvidence.get(identifier)
  }

  public addEvidence(tc: TestCase, evidence: Evidence | EvidenceError) {
    if (this.options.enabled) {
      const { identifier } = evidence
      if (tc.multipleIdentifiers && !identifier) {
        const parts = tc.identifier.split(',')
        const items = parts.map((p) => {
          const item = {
            ...evidence,
            identifier: p,
          }
          return evidence instanceof Evidence
            ? new Evidence(item)
            : new EvidenceError(item)
        })
        tc.evidence = [...tc.evidence, ...items]
      } else {
        ;(evidence.identifier = identifier || tc.identifier),
          tc.evidence.push(evidence)
      }
      this.allEvidence.set(tc.identifier, tc)
    }
  }

  public updateTestStatus(identifier: string, status: 'Passed' | 'Failed') {
    const tc = this.getTestCase(identifier)
    if (!tc) {
      return console.warn('Missing test case!')
    }
    tc.status = status
    tc.duration = Math.abs(
      new Date().getTime() - new Date(tc.started).getTime(),
    )
    this.allEvidence.set(identifier, tc)
  }

  public endCollecting() {
    if (this.options.enabled && this.allEvidence.size) {
      const ouputFilePath = path.join(
        this.options.output.folder,
        this.options.output.file,
      )
      const fileContent = JSON.parse(
        fs.readFileSync(ouputFilePath, { encoding: 'utf-8' }),
      ) as OutputResult

      for (const [tcId, entry] of this.allEvidence.entries()) {
        const moreThanOneIdentifier = tcId.split(',')
        if (moreThanOneIdentifier.length > 1) {
          for (const id of moreThanOneIdentifier) {
            const evidence = this.parseEvidence(
              fileContent.test_run_name,
              entry,
              id,
            )
            fileContent.tests.push({
              id_list: id,
              status: entry.status,
              date: entry.started,
              duration: entry.duration || 0,
              evidence,
            })
          }
        } else {
          const evidence = this.parseEvidence(fileContent.test_run_name, entry)

          fileContent.tests.push({
            id_list: tcId,
            status: entry.status,
            date: entry.started,
            duration: entry.duration || 0,
            evidence,
          })
        }
      }
      this.writeOutputFile(fileContent)
    }
    this.allEvidence.clear()
  }
}
