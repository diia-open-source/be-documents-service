import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode } from '@diia-inhouse/types'

import GetDocumentsToProcessAction from '@actions/v1/getDocumentsToProcess'

import DocumentsService from '@services/documents'

import { CommonDocument, DocumentTypeResponse, Documents } from '@interfaces/services/documents'

describe(`Action ${GetDocumentsToProcessAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const action = new GetDocumentsToProcessAction(documentsService)

    it('should return document to process', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                filter: [<DocumentType>'document-type'],
            },
            headers,
            session,
        }

        const document = new Object()

        const mockData: Documents<CommonDocument> = {
            [<DocumentTypeResponse>'document-type-response']: {
                status: HttpStatusCode.OK,
                data: [document],
            },
        }

        jest.spyOn(documentsService, 'getDocumentsToProcessV1').mockResolvedValueOnce(mockData)

        expect(await action.handler(args)).toMatchObject(mockData)
        expect(documentsService.getDocumentsToProcessV1).toHaveBeenCalledWith(args.params.filter, args.session.user)
    })
})
