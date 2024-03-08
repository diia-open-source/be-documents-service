import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode, Documents as TypedDocuments } from '@diia-inhouse/types'

import GetDocumentsToProcessByItnAction from '@actions/v1/getDocumentsToProcessByItn'

import DocumentsService from '@services/documents'

describe(`Action ${GetDocumentsToProcessByItnAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const action = new GetDocumentsToProcessByItnAction(documentsService)

    it('should return document to process by itn', async () => {
        const headers = testKit.session.getHeaders()
        const args = {
            params: {
                itn: 'itn',
                documentTypes: [<DocumentType>'document-type'],
                ignoreCache: true,
            },
            headers,
        }

        const document = new Object()

        const mockData: Partial<TypedDocuments<DocumentType>> = {
            [<DocumentType>'document-type']: {
                status: HttpStatusCode.OK,
                data: [document],
                unavailableData: [],
            },
        }

        jest.spyOn(documentsService, 'getDocumentsToProcessByItn').mockResolvedValueOnce(<TypedDocuments<DocumentType>>mockData)

        expect(await action.handler(args)).toMatchObject(mockData)
        expect(documentsService.getDocumentsToProcessByItn).toHaveBeenCalledWith(
            args.params.itn,
            args.params.documentTypes,
            args.params.ignoreCache,
        )
    })
})
