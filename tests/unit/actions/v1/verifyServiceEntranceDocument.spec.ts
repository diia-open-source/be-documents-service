import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import VerifyServiceEntranceDocumentAction from '@actions/v1/verifyServiceEntranceDocument'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${VerifyServiceEntranceDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new VerifyServiceEntranceDocumentAction(documentVerificationService)

    it('should return service entrance document after verification', async () => {
        const session = testKit.session.getServiceEntranceSession()
        const headers = { ...testKit.session.getHeaders(), token: 'token' }
        const args = {
            params: {
                documentType: DocumentType.InternalPassport,
                otp: 'otp',
            },
            session,
            headers,
        }

        const data = testKit.docs.getInternalPassport()

        jest.spyOn(documentVerificationService, 'verifyDocument').mockResolvedValueOnce(data)

        expect(await action.handler(args)).toMatchObject(data)
        expect(documentVerificationService.verifyDocument).toHaveBeenCalledWith({
            otp: args.params.otp,
            documentType: args.params.documentType,
            token: args.headers.token,
        })
    })
})
