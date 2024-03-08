import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentInstance } from '@diia-inhouse/types'

import VerifyServiceEntranceDocumentByDataAction from '@actions/v1/verifyServiceEntranceDocumentByData'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${VerifyServiceEntranceDocumentByDataAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new VerifyServiceEntranceDocumentByDataAction(documentVerificationService)

    it('should return verification by data info', async () => {
        const session = testKit.session.getServiceEntranceSession()
        const headers = testKit.session.getHeaders()
        const args = {
            params: {
                qrCode: 'qrCode',
            },
            session,
            headers,
        }

        const data = {
            isVerify: true,
            error: {},
        }

        jest.spyOn(documentVerificationService, 'verifyDocumentByData').mockResolvedValueOnce(<DocumentInstance>(<unknown>data))

        expect(await action.handler(args)).toMatchObject(data)
        expect(documentVerificationService.verifyDocumentByData).toHaveBeenCalledWith(args.params, args.headers)
    })
})
