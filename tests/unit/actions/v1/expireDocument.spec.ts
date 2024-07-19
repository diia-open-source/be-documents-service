import TestKit, { mockInstance } from '@diia-inhouse/test'

import ExpireDocumentAction from '@actions/v1/expireDocument'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'

describe(`Action ${ExpireDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentsExpirationServiceMock = mockInstance(DocumentsExpirationService)
    const documentsServiceMock = mockInstance(DocumentsService)
    const action = new ExpireDocumentAction(documentsExpirationServiceMock, documentsServiceMock)

    it('should return true and process code if deleted document', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { documentType: 'document-type' },
            session,
            headers,
        }

        jest.spyOn(documentsExpirationServiceMock, 'expireDocumentByType').mockResolvedValueOnce()

        expect(await action.handler(args)).toBeUndefined()
        expect(documentsExpirationServiceMock.expireDocumentByType).toHaveBeenCalledWith(
            args.params.documentType,
            args.session.user.identifier,
        )
    })
})
