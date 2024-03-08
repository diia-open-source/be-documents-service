import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, ProfileFeature, SessionType } from '@diia-inhouse/types'

import GetDocumentsAction from '@src/actions/v5/getDocuments'

import DocumentsService from '@services/documents'

describe('GetDocumentsAction', () => {
    const documentsServiceMock = mockInstance(DocumentsService, {
        documentFilters: [<DocumentType>'document-type-1', <DocumentType>'document-type-2'],
        documentFiltersBySessionTypeAndFeature: {
            [<SessionType>'session-type-1']: {
                [<ProfileFeature>'profile-feature-1']: [<DocumentType>'document-type-3', <DocumentType>'document-type-4'],
            },
        },
    })

    const action = new GetDocumentsAction(documentsServiceMock)
    const testKit = new TestKit()
    const userSession = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should call documentsService', async () => {
        const customActionArguments = {
            session: userSession,
            headers,
            params: { filter: [] },
        }

        jest.spyOn(documentsServiceMock, 'getDocuments')

        await expect(action.handler(customActionArguments)).resolves.toBeUndefined()

        expect(documentsServiceMock.getDocuments).toHaveBeenCalledWith(
            customActionArguments.session,
            customActionArguments.params.filter,
            customActionArguments.headers,
        )
    })
})
