import { DocumentType, Documents, ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        itn: string
        documentTypes: DocumentType[]
        ignoreCache?: boolean
    }
}

export type ActionResult = Documents
