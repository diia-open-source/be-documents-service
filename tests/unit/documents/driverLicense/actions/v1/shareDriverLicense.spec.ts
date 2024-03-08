import { randomUUID } from 'crypto'

import { ObjectId } from 'bson'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, Localization } from '@diia-inhouse/types'

import ShareDriverLicenseAction from '@src/documents/driverLicense/actions/v1/shareDriverLicense'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${ShareDriverLicenseAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new ShareDriverLicenseAction(documentVerificationService)

    it('should return otp link', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                documentId: randomUUID(),
                localization: Localization.UA,
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
            documentType: DocumentType.DriverLicense,
            documentId: args.params.documentId,
            headers: args.headers,
            userIdentifier: args.session.user.identifier,
            documentAssertParams: { itn: args.session.user.itn },
            generateBarcode: true,
            localization: args.params.localization,
        })
    })
})
