import { randomUUID } from 'crypto'

import { ObjectId } from 'bson'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import ShareTaxpayerCardAction from '@src/documents/taxpayerCard/actions/v1/shareTaxpayerCard'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${ShareTaxpayerCardAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new ShareTaxpayerCardAction(documentVerificationService)

    it('should return otp link', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                documentId: randomUUID(),
            },
            session,
            headers,
        }

        const link = {
            id: new ObjectId(),
            link: 'link',
            timerText: 'timerText',
            timerTime: 100,
        }

        jest.spyOn(documentVerificationService, 'generateOtpLink').mockResolvedValueOnce(link)

        expect(await action.handler(args)).toMatchObject(link)
        expect(documentVerificationService.generateOtpLink).toHaveBeenCalledWith({
            documentType: DocumentType.TaxpayerCard,
            documentId: args.params.documentId,
            headers: args.headers,
            userIdentifier: args.session.user.identifier,
            documentAssertParams: { user: args.session.user },
            generateBarcode: true,
        })
    })
})
