import fs from 'fs'
import path from 'path'
import { inspect } from 'util'
import { UltimateTextToImage, VerticalImage } from 'ultimate-text-to-image'
import { EnvOptions, Evidence, OutputResult, TestCase } from './types'
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

  private createEvidenceFiles(
    title: string,
    tc: TestCase,
    identifier?: string,
  ) {
    const evidence = []
    const iterator = identifier
      ? tc.evidence.filter((e) => e.identifier && e.identifier === identifier)
      : tc.evidence
    for (const ev of iterator) {
      let fileContent!: string | Buffer;
      let fileName!: string;
      const microTime = getMicroTime()
      switch(ev.type) {
        case 'Text':
          fileContent = JSON.stringify(ev.data, null, 2)
          fileName = `${identifier || tc.identifier}-dataText-${microTime}.txt`
          break;
        case 'Zip':
          fileContent = Buffer.from(ev.data)
          fileName =`${identifier || tc.identifier}-dataZip-${microTime}.zip`
          break;
        case 'Image':
        default:
          fileContent =  this.convertContentToImg(
            title,
            ev.data,
            tc.status === 'Failed',
          )
          fileContent = Buffer.from(fileContent.replace('data:image/png;base64,', ''), 'base64')
          fileName = `${identifier || tc.identifier}-dataImage-${microTime}.png`
          break
      }
      
      const ouputFilePath = path.join(
        this.options.output.folder,
        fileName,
      )
      fs.writeFileSync(
        ouputFilePath,
        fileContent
      )
      /* eslint-disable  @typescript-eslint/no-unused-vars */
      const { data, ...rest } = ev
      evidence.push({
        ...rest,
        resource: ouputFilePath,
      })
    }
    return evidence
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
        title: `${
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
    isError?: boolean,
  ): string {
    const dataStr = inspect(content)
    const titleImage = new UltimateTextToImage(`Test Cycle: ${header}`, {
      fontSize: 26,
      fontColor: isError ? '#FF0000' : '#000000',
      fontWeight: 700,
      width: 900,
      marginBottom: 20,
    })
    const dataImage = new UltimateTextToImage(dataStr, {
      fontSize: 14,
      fontColor: isError ? '#FF0000' : '#000000',
      width: 900,
      fontFamily: 'Monospace',
      borderSize: 1,
      borderColor: '#000000',
      backgroundColor: '#F0F0F0',
      margin: 10,
    })
    return new VerticalImage([titleImage, dataImage], {
      backgroundColor: '#FFFFFF',
      margin: 20,
    })
      .render()
      .toDataUrl('image/png')
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

  public extractTestCase(name: string | undefined): string | null {
    if (this.options.project && name) {
      const pattern = `${this.options.project}\\S+`
      return name.match(new RegExp(pattern, 'ig'))?.[0] || null
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

  public addEvidence(tc: TestCase, evidence: Evidence) {
    if (this.options.enabled) {
      const { description, collectedAt, data, identifier, type: evType } = evidence
      const type = evType || this.options.defaultType
      if (tc.multipleIdentifiers && !identifier) {
        const parts = tc.identifier.split(',')
        const items = parts.map((p) => {
          return {
            identifier: p,
            description,
            collectedAt,
            type,
            data,
          }
        })
        tc.evidence = [...tc.evidence, ...items]
      } else {
        tc.evidence.push({
          identifier: identifier || tc.identifier,
          description,
          collectedAt,
          type,
          data,
        })
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
            const evidence = this.createEvidenceFiles(
              fileContent.title,
              entry,
              id,
            )
            fileContent.tests.push({
              id,
              status: entry.status,
              evidence,
            })
          }
        } else {
          const evidence = this.createEvidenceFiles(fileContent.title, entry)

          fileContent.tests.push({
            id: tcId,
            status: entry.status,
            evidence,
          })
        }
      }
      this.writeOutputFile(fileContent)
    }
    this.allEvidence.clear()
  }
}
