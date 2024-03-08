import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetRegistrationInfoFromPassports from '@actions/v1/getRegistrationInfoFromPassports'

import PassportService from '@services/passport'

describe(`Action ${GetRegistrationInfoFromPassports.name}`, () => {
    const testKit = new TestKit()
    const passportService = mockInstance(PassportService)
    const action = new GetRegistrationInfoFromPassports(passportService)

    it('should return registration', async () => {
        const session = testKit.session.getPortalUserSession()
        const headers = testKit.session.getHeaders()
        const args = {
            session,
            headers,
        }

        const registration = {
            registrationAddress: 'registrationAddress',
            registrationDate: 'registrationDate',
            koatuu: 'koatuu',
            communityCode: 'communityCode',
        }

        jest.spyOn(passportService, 'getRegistrationInfoFromPassports').mockResolvedValueOnce(registration)

        expect(await action.handler(args)).toMatchObject({
            address: registration.registrationAddress,
            koatuu: registration.koatuu,
            communityCode: registration.communityCode,
        })
        expect(passportService.getRegistrationInfoFromPassports).toHaveBeenCalledWith(args.session.user)
    })
})
