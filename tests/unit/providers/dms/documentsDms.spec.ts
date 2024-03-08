import moment from 'moment'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import { NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import { PassportByInnDocumentType } from '@src/generated'

import DocumentsDmsProvider from '@providers/dms/documentsDms'

import PassportByInnDataMapper from '@dataMappers/passportByInnDataMapper'

import { getPassportByInn } from '@tests/mocks/stubs/providers/dms/passportByInn'

import { PassportGenderEN } from '@interfaces/dto'

describe('DocumentsDmsProvider', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const externalCommunicatorMock = mockInstance(ExternalCommunicator)
    const passportByInnDataMapperMock = mockInstance(PassportByInnDataMapper)
    const documentsDmsProvider = new DocumentsDmsProvider(loggerMock, externalCommunicatorMock, passportByInnDataMapperMock)

    describe('method getPassport', () => {
        const { user } = testKit.session.getUserSession()

        it('should successfully get passport', async () => {
            const registryPassportsByInn = getPassportByInn()
            const { fName, lName, mName, itn } = user
            const internalPassport = testKit.docs.getInternalPassport()
            const expectedPassport = {
                lastNameUA: internalPassport.lastNameUA,
                firstNameUA: internalPassport.firstNameUA,
                recordNumber: internalPassport.recordNumber,
                genderEN: PassportGenderEN.F,
                birthday: internalPassport.birthday,
                birthCountry: 'Україна',
                birthPlaceUA: internalPassport.birthPlaceUA,
                type: PassportByInnDocumentType.pass,
                docNumber: internalPassport.docNumber,
                issueDate: internalPassport.issueDate,
                department: internalPassport.department,
            }
            const expectedPassportRegistrationInfo = {
                address: {
                    regionName: 'М. КИЇВ',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                    registrationDate: '20.07.1969',
                },
                registrationDate: moment('20.07.1969', 'DD.MM.YYYY').toDate(),
                fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
            }
            const expectedPassportByInnRegistrationInfo = {
                address: {
                    regionName: 'М. КИЇВ',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                    registration_inf: false,
                },
                registrationDate: moment('20.07.1969', 'DD.MM.YYYY').toDate(),
                fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
            }

            jest.spyOn(externalCommunicatorMock, 'receive').mockResolvedValueOnce(registryPassportsByInn)
            jest.spyOn(passportByInnDataMapperMock, 'toEntity').mockReturnValueOnce(expectedPassport)
            jest.spyOn(passportByInnDataMapperMock, 'toRegistration').mockReturnValueOnce(expectedPassportRegistrationInfo)
            jest.spyOn(passportByInnDataMapperMock, 'toRegistrationV1').mockReturnValueOnce(expectedPassportByInnRegistrationInfo)

            const result = await documentsDmsProvider.getPassport(user)

            expect(result).toEqual({
                passport: expectedPassport,
                registration: expectedPassportRegistrationInfo,
                registrationV1: expectedPassportByInnRegistrationInfo,
            })

            expect(loggerMock.info).toHaveBeenCalledWith('Get passports by inn')
            expect(externalCommunicatorMock.receive).toHaveBeenCalledWith(ExternalEvent.RepoDocumentPassportsByInn, {
                first_name: fName,
                last_name: lName,
                middle_name: mName?.trim(),
                inn: itn,
            })
            expect(passportByInnDataMapperMock.toEntity).toHaveBeenCalledWith(registryPassportsByInn.return)
            expect(passportByInnDataMapperMock.toRegistration).toHaveBeenCalledWith(registryPassportsByInn.return)
            expect(passportByInnDataMapperMock.toRegistrationV1).toHaveBeenCalledWith(registryPassportsByInn.return)
        })

        it.each([
            [
                'undefined response is received',
                undefined,
                new Error('Unexpected error in passport response'),
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('Unexpected error caused')
                },
            ],
            ['passport not found', { success: HttpStatusCode.NOT_FOUND }, new NotFoundError('Passport not found'), (): void => {}],
            [
                'response is not Ok',
                { success: HttpStatusCode.BAD_REQUEST },
                new Error('Unsuccessful passport response'),
                (response: unknown): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('Unsuccessful response for passport by inn', { response })
                },
            ],
            [
                'error is present in return section',
                { success: HttpStatusCode.OK, return: { error: new Error('Error in return section') } },
                new Error('Unexpected error in passport response'),
                (response: unknown): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('Unexpected error in success response for passports by inn', { response })
                },
            ],
        ])('should fail with error in case %s', async (_msg, registryPassportsByInnResponse, expectedError, checkSpecificExpectations) => {
            const { fName, lName, itn } = user

            jest.spyOn(externalCommunicatorMock, 'receive').mockResolvedValueOnce(registryPassportsByInnResponse)

            await expect(async () => {
                await documentsDmsProvider.getPassport({ ...user, mName: '' })
            }).rejects.toEqual(expectedError)

            expect(externalCommunicatorMock.receive).toHaveBeenCalledWith(ExternalEvent.RepoDocumentPassportsByInn, {
                first_name: fName,
                last_name: lName,
                middle_name: '',
                inn: itn,
            })
            expect(loggerMock.error).toHaveBeenCalledWith('Failed to receive passports by inn', { err: expectedError })
            checkSpecificExpectations(registryPassportsByInnResponse)
        })
    })
})
