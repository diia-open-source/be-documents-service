import { DocumentInstance } from '@diia-inhouse/types'

import { CommonDocument } from '@interfaces/services/documents'

export const getDocumentInstance = (document: CommonDocument): DocumentInstance => {
    const { id, docNumber, docStatus } = document

    return {
        id,
        docNumber,
        docStatus,
        docData: {
            docName: 'docName',
        },
        content: [],
        fullInfo: [],
    }
}
