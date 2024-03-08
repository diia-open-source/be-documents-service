import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetDocumentVerificationByBarcodeOrOtpAction from '@actions/v1/getDocumentVerificationByBarcodeOrOtp'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${GetDocumentVerificationByBarcodeOrOtpAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new GetDocumentVerificationByBarcodeOrOtpAction(documentVerificationService)

    it('should return document verification by barcode', async () => {
        const headers = testKit.session.getHeaders()
        const args = {
            params: { barcode: 'barcode' },
            headers,
        }

        jest.spyOn(documentVerificationService, 'getValidatedVerificationRecordByBarcode').mockResolvedValueOnce({ isValid: true })

        expect(await action.handler(args)).toMatchObject({ isValid: true })
        expect(documentVerificationService.getValidatedVerificationRecordByBarcode).toHaveBeenCalledWith(args.params.barcode)
    })

    it('should return document verification by otp', async () => {
        const headers = testKit.session.getHeaders()
        const args = {
            params: { otp: 'otp' },
            headers,
        }

        jest.spyOn(documentVerificationService, 'getValidatedVerificationRecordByOtp').mockResolvedValueOnce({ isValid: true })

        expect(await action.handler(args)).toMatchObject({ isValid: true })
        expect(documentVerificationService.getValidatedVerificationRecordByOtp).toHaveBeenCalledWith(args.params.otp)
    })

    it('should throw BadRequestError if appropriate param not found', async () => {
        const headers = testKit.session.getHeaders()
        const args = {
            params: {},
            headers,
        }

        await expect(action.handler(args)).rejects.toThrow(new BadRequestError('Should be one of: barcode or qrCode'))
    })
})
