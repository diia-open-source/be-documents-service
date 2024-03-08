import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetInternalPassportToProcessAction from '@actions/v1/getInternalPassportToProcess'

import PassportService from '@services/passport'

import { idCard } from '@tests/mocks/stubs/passport'

import { InternalPassportInstance } from '@interfaces/providers/eis'

describe(`Action ${GetInternalPassportToProcessAction.name}`, () => {
    const testKit = new TestKit()
    const passportService = mockInstance(PassportService)
    const action = new GetInternalPassportToProcessAction(passportService)

    it('should return identity document', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            headers,
            session,
        }
        const identity: InternalPassportInstance = idCard

        jest.spyOn(passportService, 'getInternalPassportToProcess').mockResolvedValueOnce(identity)

        expect(await action.handler(args)).toMatchObject(identity)
        expect(passportService.getInternalPassportToProcess).toHaveBeenCalledWith(args.session.user)
    })
})
