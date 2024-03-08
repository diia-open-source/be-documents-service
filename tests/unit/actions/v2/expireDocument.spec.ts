import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import ExpireDocumentAction from '@actions/v2/expireDocument'

import DocumentsExpirationService from '@services/documentsExpiration'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()
    const documentsExpirationServiceMock = mockInstance(DocumentsExpirationService)

    const action = new ExpireDocumentAction(documentsExpirationServiceMock)

    const {
        user: { identifier },
    } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const documentType = <DocumentType>'document-type'

    it('should call documentsExpirationService', async () => {
        const expireDocumentByTypeSpy = jest.spyOn(documentsExpirationServiceMock, 'expireDocumentByType')
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
