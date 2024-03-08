import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentInstance } from '@diia-inhouse/types'

import VerifyDocumentAction from '@actions/v1/verifyDocument'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${VerifyDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new VerifyDocumentAction(documentVerificationService)

    it('should return verification result', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                qrCode: 'qrCode',
            },
            session,
            headers,
        }

        const verificationResult = {
            isVerify: true,
            error: {},
        }

        jest.spyOn(documentVerificationService, 'verifyDocumentByData').mockResolvedValueOnce(
            <DocumentInstance>(<unknown>verificationResult),
        )

        expect(await action.handler(args)).toMatchObject(verificationResult)
        expect(documentVerificationService.verifyDocumentByData).toHaveBeenCalledWith(args.params, args.headers)
    })
})
