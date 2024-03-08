import { NotFoundError, UnprocessableEntityError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus } from '@diia-inhouse/types'

import GetDriverLicenseToProcessAction from '@src/documents/driverLicense/actions/v1/getDriverLicenseToProcess'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

describe(`Action ${GetDriverLicenseToProcessAction.name}`, () => {
    const testKit = new TestKit()
    const driverLicenseService = mockInstance(DriverLicenseService)
    const action = new GetDriverLicenseToProcessAction(driverLicenseService)

    it('should throw UnprocessableEntityError if found more than one item', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = { session, headers }

        const driverLicense = [
            {
                ...testKit.docs.getDriverLicense({ docStatus: DocStatus.Ok }),
            },
            {
                ...testKit.docs.getDriverLicense({ docStatus: DocStatus.Confirming }),
            },
        ]

        jest.spyOn(driverLicenseService, 'getDriverLicenses').mockResolvedValueOnce(driverLicense)

        await expect(action.handler(args)).rejects.toThrow(
            new UnprocessableEntityError(`Unexpected amount of driver licenses: ${driverLicense.length}`),
        )
        expect(driverLicenseService.getDriverLicenses).toHaveBeenCalledWith(args.session.user.itn, undefined, null)
    })

    it('should throw NotFoundError if driver license not found', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = { session, headers }

        jest.spyOn(driverLicenseService, 'getDriverLicenses').mockResolvedValueOnce([])

        await expect(action.handler(args)).rejects.toThrow(new NotFoundError('Driver license not found'))
        expect(driverLicenseService.getDriverLicenses).toHaveBeenCalledWith(args.session.user.itn, undefined, null)
    })

    it('should return driver license', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = { session, headers }

        const driverLicense = [{ ...testKit.docs.getDriverLicense() }]

        jest.spyOn(driverLicenseService, 'getDriverLicenses').mockResolvedValueOnce(driverLicense)

        expect(await action.handler(args)).toMatchObject(driverLicense[0])
        expect(driverLicenseService.getDriverLicenses).toHaveBeenCalledWith(args.session.user.itn, undefined, null)
    })
})
