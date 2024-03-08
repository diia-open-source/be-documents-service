import moment from 'moment'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { mockInstance } from '@diia-inhouse/test'

import { PassportRegistration } from '@src/generated'

import RegistrationAddressDataMapper from '@dataMappers/registrationAddressDataMapper'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'

describe('RegistrationAddressDataMapper', () => {
    const utilsMock = mockInstance(Utils)
    const config = <AppConfig>{ app: { dateFormat: 'DD.MM.YYYY' } }
    const loggerMock = mockInstance(DiiaLogger)
    const registrationAddressDataMapper = new RegistrationAddressDataMapper(utilsMock, config, loggerMock)

    describe('method toEntity', () => {
        it('should return undefined result in case address is not provided', () => {
            expect(registrationAddressDataMapper.toEntity('')).toBeUndefined()
        })

        describe('parse from string', () => {
            it.each([
                [
                    'there is registration date',
                    'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69 20071969;8000000000',
                    {
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        registrationDate: '20.07.1969',
                        koatuu: '8000000000',
                        communityCode: undefined,
                    },
                    (): void => {
                        jest.spyOn(utilsMock, 'convertDate').mockReturnValue('20.07.1969')
                    },
                    (): void => {
                        expect(utilsMock.convertDate).toHaveBeenCalledWith('20071969', { fromFormat: 'DDMMYYYY' })
                    },
                ],
                [
                    'there is no registration date',
                    'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69 01011900;UA80000000000000000',
                    {
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        koatuu: undefined,
                        communityCode: 'UA80000000000000000',
                    },
                    (): void => {},
                    (address: string): void => {
                        expect(loggerMock.info).toHaveBeenCalledWith("Couldn't get registration date from address string", address)
                    },
                ],
                [
                    'there is no last part with registration date',
                    'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                    {
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        koatuu: undefined,
                        communityCode: undefined,
                    },
                    (): void => {},
                    (address: string): void => {
                        expect(loggerMock.info).toHaveBeenCalledWith("Couldn't get registration date from address string", address)
                    },
                ],
            ])('should return address entity in case %s', (_msg, addressString, expectedResult, defineSpies, checkExpectations) => {
                defineSpies()

                const result = registrationAddressDataMapper.toEntity(addressString)

                expect(result).toEqual(expectedResult)

                checkExpectations(addressString)
            })
        })

        describe('from passport registration info', () => {
            it.each([
                [
                    'there is registration place and date',
                    {
                        address: {
                            registrationDate: '20.07.1969',
                            cancelregistrationDate: '',
                            addressKoatuu: '8000000000',
                            addressGromKatottg: 'UA80000000000000000',
                        },
                        registrationDate: moment('20.07.1969', config.app.dateFormat).toDate(),
                        fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                    },
                    {
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        registrationDate: '20.07.1969',
                        koatuu: '8000000000',
                        communityCode: 'UA80000000000000000',
                    },
                ],
                [
                    'there is no registration date',
                    {
                        address: {
                            registrationDate: '20.07.1969',
                            cancelregistrationDate: '',
                            addressKoatuu: '8000000000',
                            addressGromKatottg: 'UA80000000000000000',
                        },
                        fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                    },
                    {
                        registrationAddress: 'МІСЦЕ РЕЄСТРАЦІЇ ВІДСУТНЄ',
                    },
                ],
            ])('should return address entity in case %s', (_msg, passportRegistrationInfo, expectedResult) => {
                const result = registrationAddressDataMapper.toEntity(passportRegistrationInfo)

                expect(result).toEqual(expectedResult)
            })
        })
    })

    describe('method toRegistrationInfo', () => {
        it.each([
            [
                'cancel registration date is present',
                {
                    cancelregistrationDate: '20.07.2007',
                    country: 'УКРАЇНА',
                    region: 'M. КИЇВ',
                    streetName: 'ВУЛ. АРМСТРОНГА',
                    buildingNumber: '11',
                    apartment: '69',
                    addressKoatuu: '8000000000',
                    addressGromKatottg: 'UA80000000000000000',
                },
                {
                    address: {
                        cancelregistrationDate: '20.07.2007',
                        country: 'УКРАЇНА',
                        region: 'M. КИЇВ',
                        streetName: 'ВУЛ. АРМСТРОНГА',
                        buildingNumber: '11',
                        apartment: '69',
                        addressKoatuu: '8000000000',
                        addressGromKatottg: 'UA80000000000000000',
                    },
                    deregistrationDate: moment('20.07.2007', config.app.dateFormat).toDate(),
                },
            ],
            [
                'both dates are missing',
                {
                    country: 'УКРАЇНА',
                    region: 'M. КИЇВ',
                    streetName: 'ВУЛ. АРМСТРОНГА',
                    buildingNumber: '11',
                    apartment: '69',
                    addressKoatuu: '8000000000',
                    addressGromKatottg: 'UA80000000000000000',
                },
                {
                    address: {
                        country: 'УКРАЇНА',
                        region: 'M. КИЇВ',
                        streetName: 'ВУЛ. АРМСТРОНГА',
                        buildingNumber: '11',
                        apartment: '69',
                        addressKoatuu: '8000000000',
                        addressGromKatottg: 'UA80000000000000000',
                    },
                },
            ],
            [
                'registration date is present',
                {
                    registrationDate: '20.07.1969',
                    country: 'УКРАЇНА',
                    region: 'M. КИЇВ',
                    streetName: 'ВУЛ. АРМСТРОНГА',
                    buildingNumber: '11',
                    apartment: '69',
                    addressKoatuu: '8000000000',
                    addressGromKatottg: 'UA80000000000000000',
                },
                {
                    address: {
                        registrationDate: '20.07.1969',
                        country: 'УКРАЇНА',
                        region: 'M. КИЇВ',
                        streetName: 'ВУЛ. АРМСТРОНГА',
                        buildingNumber: '11',
                        apartment: '69',
                        addressKoatuu: '8000000000',
                        addressGromKatottg: 'UA80000000000000000',
                    },
                    registrationDate: moment('20.07.1969', config.app.dateFormat).toDate(),
                    fullName: 'УКРАЇНА M. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                },
            ],
        ])('should return passport registration info entity in case %s', (_msg, passportRegistration, expectedResult) => {
            const result = registrationAddressDataMapper.toRegistrationInfo(
                <PassportRegistration>passportRegistration,
                config.app.dateFormat,
            )

            expect(result).toEqual(expectedResult)
        })
    })
})
