export enum EvidenceTypeEnum {
  IMAGE = 'jsonImage',
  TEXT = 'text',
}

export interface IBaseEvidence {
  identifier?: string
  collectedAt?: number
  resource?: string
  type?: EvidenceTypeEnum
}

export class Evidence implements IBaseEvidence {
  identifier?: string
  collectedAt?: number | undefined
  image?: string | undefined
  type?: EvidenceTypeEnum | undefined
  description: string
  data?: any
  px?: number

  constructor(options: Partial<Evidence>) {
    Object.assign(this, {px:900, ...options})
  }
}

export class EvidenceError implements IBaseEvidence {
  identifier?: string
  collectedAt?: number | undefined
  image?: string | undefined
  type?: EvidenceTypeEnum | undefined
  message: string
  stack: string
  px?: number;

  constructor(options: Partial<EvidenceError>) {
    Object.assign(this, {px:900, ...options})
  }
}

export type EnvOptions = {
  enabled: boolean
  project: string
  header: string
  regex?: string
  output: {
    folder: string
    file: string
  }
}

export type TestCase = {
  evidence: Array<Evidence | EvidenceError>
  multipleIdentifiers?: boolean
  identifier: string
  started: Date
  duration?: number
  status: 'Passed' | 'Failed'
}

export type OutputResult = {
  test_run_name: string
  tests: {
    id_list: string
    status: 'Passed' | 'Failed'
    duration: number
    date: Date
    evidence: Array<Evidence | EvidenceError>
  }[]
}
declare global {
  function collectAsText(description: string, data: any, identifier?:string): void
  function collectAsImage(description: string, data: any, identifier?:string): void
  function collectError(error: Error, type: EvidenceTypeEnum, identifier?: string): void
}
