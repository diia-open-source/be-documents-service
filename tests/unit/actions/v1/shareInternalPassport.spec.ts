import { randomUUID } from 'node:crypto'

import { mongo } from '@diia-inhouse/db'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import ShareInternalPassportAction from '@actions/v1/shareInternalPassport'

import DocumentVerificationService from '@services/documentVerification'

import { ShareLinkResponse } from '@interfaces/services/documentVerification'
import { PassportDocumentType } from '@interfaces/services/passport'

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

        const link = <ShareLinkResponse>(<unknown>{
            id: new mongo.ObjectId(),
            link: 'link',
            timerText: 'timerText',
            timerTime: 100,
        })

        jest.spyOn(documentVerificationService, 'generateOtpLink').mockResolvedValueOnce(link)

        expect(await action.handler(args)).toMatchObject(link)
        expect(documentVerificationService.generateOtpLink).toHaveBeenCalledWith({
            documentType: PassportDocumentType.InternalPassport,
            documentId: args.params.documentId,
            headers: args.headers,
            user: args.session.user,
        })
    })
})
