import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetDocumentsToProcessAction from '@actions/v3/getDocumentsToProcess'

import DocumentsService from '@services/documents'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()

    const userSession = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()

    it('should call documentsService', async () => {
        const documentsServiceMock = mockInstance(DocumentsService, {
            documentTypeToGrpcDocumentType: { internalPassport: 'internal-passport' },
        })

        const action = new GetDocumentsToProcessAction(documentsServiceMock)
        const documentTypes = ['internal-passport']

        jest.spyOn(documentsServiceMock, 'getDocumentsToProcess').mockResolvedValueOnce({})

        const customActionArguments = {
            params: {
                documentTypes: documentTypes,
                ignoreCache: true,
            },
            session: userSession,
            headers,
        }

        await expect(action.handler(customActionArguments)).resolves.toStrictEqual({})
    })
})
