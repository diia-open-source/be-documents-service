import { NotFoundError, UnprocessableEntityError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetDriverLicenseToProcessAction from '@src/documents/driverLicense/actions/v2/getDriverLicenseToProcess'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

describe('ExpireDocumentAction', () => {
    const testKit = new TestKit()
    const driverLicenseService = mockInstance(DriverLicenseService)

    const action = new GetDriverLicenseToProcessAction(driverLicenseService)

    const headers = testKit.session.getHeaders()

    it('should throw UnprocessableEntityError when trafficService return more then one driverLicenses', async () => {
        jest.spyOn(driverLicenseService, 'getDriverLicenses').mockResolvedValueOnce([
            testKit.docs.getDriverLicense(),
            testKit.docs.getDriverLicense(),
        ])

        await expect(
            action.handler({
                params: {
                    itn: 'itn',
                    ignoreCache: true,
                },
                headers,
            }),
        ).rejects.toBeInstanceOf(UnprocessableEntityError)
    })

    it('should throw NotFoundError for empty array from trafficService', async () => {
        jest.spyOn(driverLicenseService, 'getDriverLicenses').mockResolvedValueOnce([])

        await expect(
            action.handler({
                params: {
                    itn: 'itn',
                    ignoreCache: true,
                },
                headers,
            }),
        ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('should return driverLicense from trafficService', async () => {
        const driverLicense = testKit.docs.getDriverLicense()
        const getDriverLicensesSpy = jest.spyOn(driverLicenseService, 'getDriverLicenses').mockResolvedValueOnce([driverLicense])
        const customActionArguments = {
            params: {
                itn: 'itn',
                ignoreCache: true,
            },
            headers,
        }

        await expect(action.handler(customActionArguments)).resolves.toStrictEqual(driverLicense)

        expect(getDriverLicensesSpy).toHaveBeenCalledWith(
            customActionArguments.params.itn,
            undefined,
            null,
            customActionArguments.params.ignoreCache,
        )
    })
})
