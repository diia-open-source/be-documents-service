import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import VerifyDriverLicenseAction from '@src/documents/driverLicense/actions/v1/verifyDriverLicense'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${VerifyDriverLicenseAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new VerifyDriverLicenseAction(documentVerificationService)

    it('should return driver license after verification', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                otp: 'otp',
            },
            session,
            headers: { ...headers, token: 'token' },
        }

        const driversLicense = testKit.docs.getDriverLicense()

        jest.spyOn(documentVerificationService, 'verifyDocument').mockResolvedValueOnce(driversLicense)

        expect(await action.handler(args)).toMatchObject(driversLicense)
        expect(documentVerificationService.verifyDocument).toHaveBeenCalledWith({
            otp: args.params.otp,
            documentType: DocumentType.DriverLicense,
            token: args.headers.token,
        })
    })
})
