export enum EvidenceTypeEnum {
  IMAGE = "Image",
  TEXT = "Text",
  ZIP = "Zip"
}

export type Evidence = {
  identifier: string
  description: string
  collectedAt?: number
  data?: any
  resource?: string
  type?: EvidenceTypeEnum
}

export type EnvOptions = {
  enabled: boolean
  project: string
  header: string
  defaultType?: EvidenceTypeEnum
  output: {
    folder: string
    file: string
  }
}

export type TestCase = {
  evidence: Evidence[]
  multipleIdentifiers?: boolean
  identifier: string
  started: Date
  status: 'Passed' | 'Failed'
}

export type OutputResult = {
  title: string
  tests: {
    id: string,
    status: 'Passed' | 'Failed',
    evidence: Evidence[]
  }[]
}
