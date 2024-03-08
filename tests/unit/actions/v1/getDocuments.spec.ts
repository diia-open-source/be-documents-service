import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode } from '@diia-inhouse/types'

import GetDocumentsAction from '@actions/v1/getDocuments'

import DocumentsService from '@services/documents'

import { DocumentResponseVariation, DocumentTypeResponse, DocumentsWithOrder } from '@interfaces/services/documents'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const action = new GetDocumentsAction(documentsService)

    it('should return document by document-type', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                filter: [<DocumentType>'document-type'],
            },
            headers,
            session,
        }

        const document = new Object()

        const mockData: DocumentsWithOrder<DocumentResponseVariation> = {
            [<DocumentTypeResponse>'document-type-response']: {
                status: HttpStatusCode.ACCEPTED,
                data: [document],
                unavailableData: [],
            },
            documentsTypeOrder: [<DocumentTypeResponse>'document-type-response'],
        }

        jest.spyOn(documentsService, 'getDocuments').mockResolvedValueOnce(mockData)

        expect(await action.handler(args)).toMatchObject(mockData)
        expect(documentsService.getDocuments).toHaveBeenCalledWith(args.session, args.params.filter, args.headers)
    })
})
