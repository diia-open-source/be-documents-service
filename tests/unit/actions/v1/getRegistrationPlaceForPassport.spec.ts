import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PlatformType } from '@diia-inhouse/types'

import GetRegistrationPlaceForPassportAction from '@actions/v1/getRegistrationPlaceForPassport'

import PassportService from '@services/passport'

describe(`Action ${GetRegistrationPlaceForPassportAction.name}`, () => {
    const testKit = new TestKit()
    const passportService = mockInstance(PassportService)
    const diiaLogger = mockInstance(DiiaLogger)
    const action = new GetRegistrationPlaceForPassportAction(passportService, diiaLogger)

    it('should throw BadRequestError if iOS platform type', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { unzr: 'unzr' },
            session,
            headers: { ...headers, platformType: PlatformType.iOS },
        }

        await expect(action.handler(args)).rejects.toThrow(new BadRequestError('Use registration place from passport'))
    })

    it('should throw NotFoundError if empty currentRegistrationPlaceUA', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { unzr: 'unzr' },
            session,
            headers,
        }

        jest.spyOn(passportService, 'getRegistrationPlaceForPassport').mockResolvedValueOnce('')

        await expect(action.handler(args)).rejects.toThrow(new NotFoundError())
    })

    it('should return current registration place UA', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { unzr: 'unzr' },
            session,
            headers,
        }

        jest.spyOn(passportService, 'getRegistrationPlaceForPassport').mockResolvedValueOnce('registration')

        expect(await action.handler(args)).toMatchObject({ currentRegistrationPlaceUA: 'registration' })
        expect(passportService.getRegistrationPlaceForPassport).toHaveBeenCalledWith(args.session.user)
    })
})
