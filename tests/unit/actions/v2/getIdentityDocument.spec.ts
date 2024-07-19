import TestKit, { mockInstance } from '@diia-inhouse/test'

import { PassportType } from '@src/generated'

import GetIdentityDocumentAction from '@actions/v2/getIdentityDocument'

import DocumentsService from '@services/documents'

import { IdentityDocument } from '@interfaces/services/documents'
import { PassportDocumentType } from '@interfaces/services/passport'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService)

    const action = new GetIdentityDocumentAction(documentsServiceMock)

    const headers = testKit.session.getHeaders()

    it('should return identityDocument', async () => {
        const userSession = testKit.session.getUserSession()
        const identityDocument = <IdentityDocument>(<unknown>{
            identityType: PassportDocumentType.ForeignPassport,
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
