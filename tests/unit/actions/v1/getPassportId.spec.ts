import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PassportType } from '@diia-inhouse/types'

import GetPassportIdAction from '@actions/v1/getPassportId'

import DocumentsExpirationService from '@services/documentsExpiration'

describe(`Action ${GetPassportIdAction.name}`, () => {
    const testKit = new TestKit()
    const documentsExpirationService = mockInstance(DocumentsExpirationService)
    const action = new GetPassportIdAction(documentsExpirationService)

    it('should return passport id', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                mobileUid: headers.mobileUid,
                userIdentifier: session.user.identifier,
            },
            headers,
            session,
        }

        const passportId = {
            id: randomUUID(),
            type: PassportType.ID,
            unzr: 'unzr',
        }

        jest.spyOn(documentsExpirationService, 'getPassportId').mockResolvedValueOnce(passportId)

        expect(await action.handler(args)).toMatchObject(passportId)
        expect(documentsExpirationService.getPassportId).toHaveBeenCalledWith(args.params.mobileUid, args.params.userIdentifier)
    })
})
