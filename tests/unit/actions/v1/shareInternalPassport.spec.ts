import { randomUUID } from 'crypto'

import { ObjectId } from 'bson'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, PassportType } from '@diia-inhouse/types'

import ShareInternalPassportAction from '@actions/v1/shareInternalPassport'

import DocumentVerificationService from '@services/documentVerification'

describe(`Action ${ShareInternalPassportAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new ShareInternalPassportAction(documentVerificationService)

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
            documentType: DocumentType.InternalPassport,
            documentId: args.params.documentId,
            headers: args.headers,
            userIdentifier: args.session.user.identifier,
            documentAssertParams: { user: args.session.user, passportType: PassportType.ID },
            generateBarcode: true,
        })
    })
})
