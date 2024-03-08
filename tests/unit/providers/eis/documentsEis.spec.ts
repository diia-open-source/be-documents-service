import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, DocumentNotFoundError, ExternalCommunicatorError, ServiceUnavailableError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import DocumentsEisProvider from '@providers/eis/documentsEis'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'

import { AppConfig } from '@interfaces/config'

describe('DocumentsEisProvider', () => {
    const testKit = new TestKit()
    const passportDataMapperMock = mockInstance(PassportDataMapper)
    const utilsMock = mockInstance(Utils)
    const externalCommunicatorMock = mockInstance(ExternalCommunicator)
    const loggerMock = mockInstance(DiiaLogger)
    const documentsEisProvider = new DocumentsEisProvider(
        passportDataMapperMock,
        utilsMock,
        <AppConfig>{
            eis: {
                addressInStructure: true,
            },
        },
        externalCommunicatorMock,
        loggerMock,
    )
    const { user } = testKit.session.getUserSession({}, true)
    const { itn: rnokpp, fName: firstname, lName: lastname, mName: middlename } = user
    const person = {
        rnokpp,
    }
    const representative = {
        rnokpp,
        firstname,
        lastname,
        middlename,
    }

    describe('method getPassports', () => {
        describe('when addressInStructure is true', () => {
            it('should successfully get passports', async () => {
                const registryPassportResponse = getPassport()

                jest.spyOn(externalCommunicatorMock, 'receiveDirect').mockResolvedValueOnce(registryPassportResponse)

                const result = await documentsEisProvider.getPassports(person, representative)

                expect(result).toEqual(registryPassportResponse)

                expect(loggerMock.info).toHaveBeenCalledWith('Start getting Passports by ITN')
                expect(externalCommunicatorMock.receiveDirect).toHaveBeenCalledWith(
                    ExternalEvent.RepoDocumentPassports,
                    {
                        addressInStructure: true,
                        person,
                        representative,
                    },
                    {},
                )
            })

            it.each([
                ['no content', { code: HttpStatusCode.NO_CONTENT, detail: 'No Content' }, new DocumentNotFoundError(), (): void => {}],
                [
                    'unauthorized',
                    { code: HttpStatusCode.UNAUTHORIZED, detail: 'Unauthorized' },
                    new ServiceUnavailableError(),
                    (): void => {},
                ],
                ['forbidden', { code: HttpStatusCode.FORBIDDEN, detail: 'Forbidden' }, new AccessDeniedError(), (): void => {}],
                ['not found', { code: HttpStatusCode.NOT_FOUND, detail: 'Not Found' }, new DocumentNotFoundError(), (): void => {}],
                [
                    'internal server error',
                    { code: HttpStatusCode.INTERNAL_SERVER_ERROR, detail: 'Internal Server Error' },
                    new ServiceUnavailableError(),
                    (): void => {},
                ],
                [
                    'gateway timeout',
                    { code: HttpStatusCode.GATEWAY_TIMEOUT, detail: 'Gateway Timeout' },
                    new ServiceUnavailableError(),
                    (statusCode: unknown, requestData: unknown): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error, unknown', { statusCode, requestData })
                    },
                ],
            ])('should fail with error in case %s', async (_msg, registryPassportResponse, expectedError, checkSpecificExpectations) => {
                jest.spyOn(externalCommunicatorMock, 'receiveDirect').mockResolvedValueOnce(registryPassportResponse)

                await expect(async () => {
                    await documentsEisProvider.getPassports(person, representative)
                }).rejects.toEqual(expectedError)

                expect(loggerMock.info).toHaveBeenCalledWith('Start getting Passports by ITN')
                expect(externalCommunicatorMock.receiveDirect).toHaveBeenCalledWith(
                    ExternalEvent.RepoDocumentPassports,
                    {
                        addressInStructure: true,
                        person,
                        representative,
                    },
                    {},
                )
                expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                    response: registryPassportResponse,
                })
                checkSpecificExpectations(registryPassportResponse.code, {
                    addressInStructure: true,
                    person,
                    representative,
                })
            })
        })

        describe('when addressInStructure is false', () => {
            const documentsEisProviderWithoutAddressInStructure = new DocumentsEisProvider(
                passportDataMapperMock,
                utilsMock,
                <AppConfig>{
                    eis: {
                        addressInStructure: false,
                    },
                },
                externalCommunicatorMock,
                loggerMock,
            )

            it('should successfully get passports', async () => {
                const registryPassportResponse = { success: HttpStatusCode.OK, return: getPassport() }

                jest.spyOn(externalCommunicatorMock, 'receiveDirect').mockResolvedValueOnce(registryPassportResponse)

                const result = await documentsEisProviderWithoutAddressInStructure.getPassports(person, representative)

                expect(result).toEqual(registryPassportResponse.return)

                expect(loggerMock.info).toHaveBeenCalledWith('Start getting Passports by ITN')
                expect(externalCommunicatorMock.receiveDirect).toHaveBeenCalledWith(
                    ExternalEvent.RepoDocumentPassports,
                    {
                        addressInStructure: false,
                        person,
                        representative,
                    },
                    {},
                )
            })

            it.each([
                [
                    'no content',
                    { error: { code: HttpStatusCode.NO_CONTENT } },
                    new DocumentNotFoundError(),
                    (): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                            response: { error: { code: HttpStatusCode.NO_CONTENT } },
                        })
                    },
                ],
                [
                    'unauthorized',
                    { error: { code: HttpStatusCode.UNAUTHORIZED } },
                    new ServiceUnavailableError(),
                    (): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                            response: { error: { code: HttpStatusCode.UNAUTHORIZED } },
                        })
                    },
                ],
                [
                    'forbidden',
                    { error: { code: HttpStatusCode.FORBIDDEN } },
                    new AccessDeniedError(),
                    (): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                            response: { error: { code: HttpStatusCode.FORBIDDEN } },
                        })
                    },
                ],
                [
                    'not found',
                    { error: { code: HttpStatusCode.NOT_FOUND } },
                    new DocumentNotFoundError(),
                    (): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                            response: { error: { code: HttpStatusCode.NOT_FOUND } },
                        })
                    },
                ],
                [
                    'internal server error',
                    { error: { code: HttpStatusCode.INTERNAL_SERVER_ERROR } },
                    new ServiceUnavailableError(),
                    (): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                            response: { error: { code: HttpStatusCode.INTERNAL_SERVER_ERROR } },
                        })
                    },
                ],
                [
                    'gateway timeout',
                    { error: { code: HttpStatusCode.GATEWAY_TIMEOUT } },
                    new ServiceUnavailableError(),
                    (requestData: unknown): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error, unknown', {
                            statusCode: HttpStatusCode.GATEWAY_TIMEOUT,
                            requestData,
                        })
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error response', {
                            response: { error: { code: HttpStatusCode.GATEWAY_TIMEOUT } },
                        })
                    },
                ],
                [
                    'return section is undefined',
                    { return: undefined },
                    new ServiceUnavailableError('Got empty eis registry response'),
                    (): void => {
                        expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error, no eis registry response', {
                            response: { return: undefined },
                        })
                    },
                ],
            ])('should fail with error in case %s', async (_msg, registryPassportResponse, expectedError, checkSpecificExpectations) => {
                jest.spyOn(externalCommunicatorMock, 'receiveDirect').mockResolvedValueOnce(registryPassportResponse)

                await expect(async () => {
                    await documentsEisProviderWithoutAddressInStructure.getPassports(person, representative)
                }).rejects.toEqual(expectedError)

                expect(loggerMock.info).toHaveBeenCalledWith('Start getting Passports by ITN')
                expect(externalCommunicatorMock.receiveDirect).toHaveBeenCalledWith(
                    ExternalEvent.RepoDocumentPassports,
                    {
                        addressInStructure: false,
                        person,
                        representative,
                    },
                    {},
                )
                checkSpecificExpectations({
                    addressInStructure: false,
                    person,
                    representative,
                })
            })
        })

        describe('when external communicator throws error', () => {
            it.each([
                [
                    'not found rnokpp regexp is satisfied by error message',
                    new ExternalCommunicatorError(
                        `unauthorized: agreement rnokpp=${person.rnokpp} not found`,
                        HttpStatusCode.BAD_REQUEST,
                        {},
                    ),
                    new DocumentNotFoundError(),
                    HttpStatusCode.NOT_FOUND,
                ],
                [
                    'regular error is thrown',
                    new ExternalCommunicatorError('Forbidden', HttpStatusCode.FORBIDDEN, {}),
                    new AccessDeniedError(),
                    HttpStatusCode.FORBIDDEN,
                ],
            ])('should fail with error in case %s', async (_msg, rejectedError, expectedError, expectedStatusCode) => {
                jest.spyOn(externalCommunicatorMock, 'receiveDirect').mockRejectedValueOnce(rejectedError)

                await expect(async () => {
                    await documentsEisProvider.getPassports(person, representative)
                }).rejects.toEqual(expectedError)

                expect(loggerMock.info).toHaveBeenCalledWith('Start getting Passports by ITN')
                expect(externalCommunicatorMock.receiveDirect).toHaveBeenCalledWith(
                    ExternalEvent.RepoDocumentPassports,
                    {
                        addressInStructure: true,
                        person,
                        representative,
                    },
                    {},
                )
                expect(loggerMock.error).toHaveBeenCalledWith(`Fetch failed for eis: ${rejectedError.getCode()}`, rejectedError.getData())
                expect(loggerMock.error).toHaveBeenCalledWith('Get passports result: error', {
                    requestData: {
                        addressInStructure: true,
                        person,
                        representative,
                    },
                    error: rejectedError?.getData(),
                    statusCode: expectedStatusCode,
                })
            })
        })
    })

    describe('method getPassportFull', () => {
        it('should successfully get full passport data', async () => {
            const registryPassportResponse = getPassport()
            const expectedResult = {
                data: [],
            }

            jest.spyOn(documentsEisProvider, 'getPassports').mockResolvedValueOnce(registryPassportResponse)
            jest.spyOn(passportDataMapperMock, 'toFullEntity').mockReturnValueOnce(expectedResult)

            const result = await documentsEisProvider.getPassportFull(person, representative)

            expect(result).toEqual(expectedResult)

            expect(documentsEisProvider.getPassports).toHaveBeenCalledWith(person, representative)
            expect(passportDataMapperMock.toFullEntity).toHaveBeenCalledWith(registryPassportResponse)
        })
    })

    describe('method collectRequestData', () => {
        it('should return passport request data', () => {
            jest.spyOn(utilsMock, 'collectPerson').mockReturnValueOnce(person)
            jest.spyOn(utilsMock, 'collectRepresentative').mockReturnValueOnce(representative)

            const expectedResult = {
                addressInStructure: true,
                person,
                representative,
            }

            const result = documentsEisProvider.collectRequestData(user)

            expect(result).toEqual(expectedResult)

            expect(utilsMock.collectPerson).toHaveBeenCalledWith(user)
            expect(utilsMock.collectRepresentative).toHaveBeenCalledWith(user)
        })
    })
})
