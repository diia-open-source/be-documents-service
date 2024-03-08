import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetRegistrationAction from '@actions/v1/getRegistration'

import PassportService from '@services/passport'

describe(`Action ${GetRegistrationAction.name}`, () => {
    const testKit = new TestKit()
    const passportService = mockInstance(PassportService)
    const action = new GetRegistrationAction(passportService)

    it('should return registration', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { itn: session.user.itn },
            headers,
            session,
        }

        const registration = {
            address: {
                registrationDate: 'registrationDate',
                cancelregistrationDate: 'cancelregistrationDate',
            },
        }

        jest.spyOn(passportService, 'getRegistration').mockResolvedValueOnce(registration)

        expect(await action.handler(args)).toMatchObject({ registration })
        expect(passportService.getRegistration).toHaveBeenCalledWith(args.session.user)
    })
})
