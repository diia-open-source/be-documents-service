import TestKit, { mockInstance } from '@diia-inhouse/test'
import { IdentityDocumentType, PassportType } from '@diia-inhouse/types'

import GetIdentityDocumentAction from '@actions/v2/getIdentityDocument'

import DocumentsService from '@services/documents'

import { IdentityDocument } from '@interfaces/services/documents'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService)

    const action = new GetIdentityDocumentAction(documentsServiceMock)

    const headers = testKit.session.getHeaders()

    it('should return identityDocument', async () => {
        const userSession = testKit.session.getUserSession()
        const identityDocument = <IdentityDocument>(<unknown>{
            identityType: IdentityDocumentType.ForeignPassport,
            type: PassportType.P,
        })

        const getIdentityDocumentSpy = jest.spyOn(documentsServiceMock, 'getIdentityDocument').mockResolvedValueOnce(identityDocument)
        const customActionArguments = {
            session: userSession,
            headers,
        }

        await expect(action.handler(customActionArguments)).resolves.toStrictEqual({
            identityDocument,
        })

        expect(getIdentityDocumentSpy).toHaveBeenCalledWith(userSession.user)
    })
})
