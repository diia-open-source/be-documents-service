import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetInternalPassportWithRegistrationAction from '@actions/v1/getInternalPassportWithRegistration'

import PassportService from '@services/passport'

import { getPassportWithRegistration } from '@mocks/stubs'

describe(`Action ${GetInternalPassportWithRegistrationAction.name}`, () => {
    const testKit = new TestKit()
    const passportService = mockInstance(PassportService)
    const action = new GetInternalPassportWithRegistrationAction(passportService)

    it('should return passport with fetched from service registration', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                digitalPassportRegistration: true,
            },
            headers,
            session,
        }

        const passportWithRegistration = getPassportWithRegistration()

        const passportRegistrationInfo = {
            address: {
                registrationDate: '2020-03-04',
                cancelregistrationDate: '2027-05-13',
            },
        }

        jest.spyOn(passportService, 'getPassportByInn').mockResolvedValueOnce(passportWithRegistration)
        jest.spyOn(passportService, 'getRegistration').mockResolvedValueOnce(passportRegistrationInfo)

        expect(await action.handler(args)).toMatchObject({
            passport: passportWithRegistration.passport,
            registration: passportRegistrationInfo,
        })
        expect(passportService.getPassportByInn).toHaveBeenCalledWith(args.session.user)
        expect(passportService.getRegistration).toHaveBeenCalledWith(args.session.user, ['passport'])
    })

    it('should return passport with registration', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                digitalPassportRegistration: false,
            },
            headers,
            session,
        }

        const passportWithRegistration = getPassportWithRegistration()

        jest.spyOn(passportService, 'getPassportByInn').mockResolvedValueOnce(passportWithRegistration)
        jest.spyOn(passportService, 'getRegistration').mockResolvedValueOnce(undefined)

        expect(await action.handler(args)).toMatchObject({
            passport: passportWithRegistration.passport,
            registration: passportWithRegistration.registration,
        })
        expect(passportService.getPassportByInn).toHaveBeenCalledWith(args.session.user)
    })
})
