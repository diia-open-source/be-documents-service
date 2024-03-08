import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import VerifyTaxpayerCardAction from '@src/documents/taxpayerCard/actions/v1/verifyTaxpayerCard'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${VerifyTaxpayerCardAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new VerifyTaxpayerCardAction(documentVerificationService)

    it('should return tax payer info after verification', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                otp: 'otp',
            },
            session,
            headers: { ...headers, token: 'token' },
        }

        const data = testKit.docs.getTaxpayerCard()

        jest.spyOn(documentVerificationService, 'verifyDocument').mockResolvedValueOnce(data)

        expect(await action.handler(args)).toMatchObject(data)
        expect(documentVerificationService.verifyDocument).toHaveBeenCalledWith({
            otp: args.params.otp,
            documentType: DocumentType.TaxpayerCard,
            token: args.headers.token,
        })
    })
})
