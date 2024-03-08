import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { DocumentNotFoundError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import { client, clientAddr, driverLicenseDocument } from '@src/documents/driverLicense/providers/hsc/mockData'

describe('DriverLicenseHscProvider', () => {
    const driverLicenseDataMapperMock = mockInstance(DriverLicenseDataMapper)

    const externalMock = mockInstance(ExternalCommunicator)
    const loggerMock = mockInstance(DiiaLogger)

    const documentsHscProvider = new DriverLicenseHscProvider(driverLicenseDataMapperMock, externalMock, loggerMock)

    const itn = 'itn'

    describe('method: `getDriverLicense`', () => {
        it.each([
            [
                {
                    driverLicense: [driverLicenseDocument],
                    clientAddr: [clientAddr],
                },
                {
                    client,
                    clientAddr: [clientAddr],
                },
                {
                    client,
                    driverLicense: [driverLicenseDocument],
                },
            ],
        ])('should throw DocumentNotFoundError when part of response does not present', async (receiveResponse) => {
            jest.spyOn(externalMock, 'receiveDirect').mockResolvedValueOnce(receiveResponse)

            await expect(documentsHscProvider.getDriverLicense(itn)).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should return response', async () => {
            const registryDriverLicenseDTO = {
                driverLicense: [driverLicenseDocument],
                clientAddr: [clientAddr],
                client: [clientAddr],
            }

            jest.spyOn(externalMock, 'receiveDirect').mockResolvedValueOnce(registryDriverLicenseDTO)

            await expect(documentsHscProvider.getDriverLicense(itn)).resolves.toStrictEqual(registryDriverLicenseDTO)

            expect(externalMock.receiveDirect).toHaveBeenCalledWith(
                expect.any(String),
                {
                    rnokpp: itn,
                },
                {
                    ignoreCache: undefined,
                },
            )
        })
    })

    describe('method: `getDriverLicenseFull`', () => {
        it('should call driverLicenseDataMapper', async () => {
            const registryDriverLicenseDTO = {
                driverLicense: [driverLicenseDocument],
                clientAddr: [clientAddr, clientAddr],
                client: [clientAddr, clientAddr],
            }

            jest.spyOn(externalMock, 'receiveDirect').mockResolvedValueOnce(registryDriverLicenseDTO)

            await documentsHscProvider.getDriverLicenseFull(itn)

            expect(driverLicenseDataMapperMock.toFullEntity).toHaveBeenCalledWith(registryDriverLicenseDTO)
        })
    })
})
