import { DocumentType } from '@diia-inhouse/types'

export interface EventPayload {
    userIdentifier: string
    documentTypes: DocumentType[]
}
