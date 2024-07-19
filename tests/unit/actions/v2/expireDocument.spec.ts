import TestKit, { mockInstance } from '@diia-inhouse/test'

import ExpireDocumentAction from '@actions/v2/expireDocument'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const documentsExpirationService = mockInstance(DocumentsExpirationService)

    const action = new ExpireDocumentAction(documentsService, documentsExpirationService)

    const {
        user: { identifier },
    } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const documentType = 'document-type'

    it('should call documentsExpirationService', async () => {
        const expireDocumentByTypeSpy = jest.spyOn(documentsExpirationService, 'expireDocumentByType')
        const customActionArguments = {
            params: {
                documentType,
                userIdentifier: identifier,
            },
            headers,
        }

        await expect(action.handler(customActionArguments)).resolves.toBeUndefined()

        expect(expireDocumentByTypeSpy).toHaveBeenCalledWith(documentType, identifier)
    })
})
