import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import GetDocumentsToProcessAction from '@actions/v2/getDocumentsToProcess'

import DocumentsService from '@services/documents'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService)

    const action = new GetDocumentsToProcessAction(documentsServiceMock)

    const userSession = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()

    it('should call documentsService', async () => {
        const getDocumentsToProcessSpy = jest.spyOn(documentsServiceMock, 'getDocumentsToProcess')
        const documentTypes = [<DocumentType>'document-type']
        const customActionArguments = {
            params: {
                documentTypes: documentTypes,
                queries: {},
                ignoreCache: true,
            },
            session: userSession,
            headers,
        }

        await expect(action.handler(customActionArguments)).resolves.toBeUndefined()

        expect(getDocumentsToProcessSpy).toHaveBeenCalledWith(
            userSession.user,
            headers,
            customActionArguments.params.documentTypes,
            customActionArguments.params.queries,
            customActionArguments.params.ignoreCache,
        )
    })
})
