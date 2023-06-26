export enum EvidenceTypeEnum {
  IMAGE = "jsonImage",
  TEXT = "text"
}

export interface IBaseEvidence {
  identifier: string
  collectedAt?: number
  resource?: string
  type?: EvidenceTypeEnum
}


export class Evidence implements IBaseEvidence {
  identifier: string
  collectedAt?: number | undefined
  resource?: string | undefined
  type?: EvidenceTypeEnum | undefined
  description: string
  data?: any

  constructor(options: Partial<Evidence>) {
    Object.assign(this, options)
  }
}

export class EvidenceError implements IBaseEvidence {
  identifier: string
  collectedAt?: number | undefined
  resource?: string | undefined
  type?: EvidenceTypeEnum | undefined
  message:string
  stack:string

  constructor(options: Partial<EvidenceError>) {
    Object.assign(this, options)
  }
}


export type EnvOptions = {
  enabled: boolean
  project: string
  header: string
  regex?: string,
  output: {
    folder: string
    file: string
  }
}

export type TestCase = {
  evidence: Array<Evidence|EvidenceError>
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
    date: Date,
    evidence: Array<Evidence|EvidenceError>
  }[]
}
