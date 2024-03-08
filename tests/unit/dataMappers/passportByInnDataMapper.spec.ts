import moment from 'moment'

import { mockInstance } from '@diia-inhouse/test'

import { PassportRegistrationInfo } from '@src/generated'

import PassportByInnDataMapper from '@dataMappers/passportByInnDataMapper'
import RegistrationAddressDataMapper from '@dataMappers/registrationAddressDataMapper'

import { getPassportByInn } from '@tests/mocks/stubs/providers/dms/passportByInn'

import { RegistryPassportsByInn } from '@interfaces/dto'

describe('PassportByInnDataMapper', () => {
    const registrationAddressDataMapperMock = mockInstance(RegistrationAddressDataMapper)
    const passportByInnDataMapper = new PassportByInnDataMapper(registrationAddressDataMapperMock)
    const { return: reponseWithPassport } = getPassportByInn()
    const passportByInn = <RegistryPassportsByInn>reponseWithPassport

    describe('method toEntity', () => {
        it('should successfully convert to passport info', () => {
            expect(passportByInnDataMapper.toEntity(passportByInn)).toEqual({
                lastNameUA: passportByInn.last_name,
                firstNameUA: passportByInn.first_name,
                middleNameUA: passportByInn.middle_name,
                recordNumber: passportByInn.unzr,
                genderEN: passportByInn.gender,
                birthday: passportByInn.date_birth,
                birthCountry: passportByInn.birth_country,
                birthPlaceUA: passportByInn.birth_place,
                type: passportByInn.documents.type,
                docSerial: passportByInn.documents.documentSerial,
                docNumber: passportByInn.documents.number,
                issueDate: passportByInn.documents.date_issue,
                expirationDate: passportByInn.documents.date_expiry,
                department: passportByInn.documents.dep_issue,
            })
        })

        it('should return undefined in case documents are false', () => {
            expect(
                passportByInnDataMapper.toEntity({ ...passportByInn, documents: { ...passportByInn.documents, documents: false } }),
            ).toBeUndefined()
        })
    })

    describe('method toRegistrationV1', () => {
        it.each([
            [
                'cancel registration date is present',
                {
                    ...passportByInn,
                    registration: { ...passportByInn.registration, cancelregistration_date: '20.07.2000', region: undefined },
                },
                {
                    address: {
                        ...passportByInn.registration,
                        region: undefined,
                        regionName: undefined,
                        districtName: '',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        cancelregistration_date: '20.07.2000',
                    },
                    deregistrationDate: moment('20.07.2000', 'DD.MM.YYYY').toDate(),
                },
                (): void => {},
                (): void => {},
            ],
            [
                'no registration date',
                {
                    ...passportByInn,
                    registration: { ...passportByInn.registration, registration_date: undefined, region: undefined },
                },
                {
                    address: {
                        ...passportByInn.registration,
                        region: undefined,
                        regionName: undefined,
                        districtName: '',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        registration_date: undefined,
                    },
                },
                (): void => {},
                (): void => {},
            ],
            [
                'registration date is present',
                passportByInn,
                {
                    address: {
                        ...passportByInn.registration,
                        regionName: '',
                        districtName: '',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                    },
                    registrationDate: moment(passportByInn.registration.registration_date, 'DD.MM.YYYY').toDate(),
                    fullName: 'Some address full string',
                },
                (): void => {
                    jest.spyOn(registrationAddressDataMapperMock, 'getAddressFullName').mockReturnValueOnce('Some address full string')
                },
                (): void => {
                    expect(registrationAddressDataMapperMock.getAddressFullName).toHaveBeenCalledWith({
                        addressGromKatottg: 'UA80000000000093317',
                        addressKatottg: 'UA80000000000093317',
                        addressKoatuu: '',
                        apartment: '69',
                        buildingNumber: '11',
                        buildingPart: '',
                        cancelregistrationDate: '',
                        cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                        cityDistrictKatottg: 'UA80000000001078669',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        country: 'УКРАЇНА',
                        postbox: '84110',
                        region: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        regionName: '',
                        registrationDate: '20.07.1969',
                        settlementName: 'КИЇВ',
                        settlementType: 'М.',
                        streetName: 'АРМСТРОНГА',
                        streetType: 'ВУЛ.',
                    })
                },
            ],
        ])(
            'should return valid passport registration info in case %s',
            (_msg, inputPassportByInn, expectedResult, defineSpies, checkExpectations) => {
                defineSpies()

                expect(passportByInnDataMapper.toRegistrationV1(inputPassportByInn)).toEqual(expectedResult)

                checkExpectations()
            },
        )
    })

    describe('method toRegistration', () => {
        it('should successfully compose and return passport registration info', () => {
            const expectedAddress = {
                addressGromKatottg: 'UA80000000000093317',
                addressKatottg: 'UA80000000000093317',
                addressKoatuu: '',
                apartment: '69',
                buildingNumber: '11',
                buildingPart: '',
                cancelregistrationDate: '',
                cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                cityDistrictKatottg: 'UA80000000001078669',
                cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                country: 'УКРАЇНА',
                postbox: '84110',
                region: '',
                regionDistrict: '',
                regionDistrictName: '',
                regionName: '',
                registrationDate: '20.07.1969',
                settlementName: 'КИЇВ',
                settlementType: 'М.',
                streetName: 'АРМСТРОНГА',
                streetType: 'ВУЛ.',
            }
            const expectedResult: PassportRegistrationInfo = {
                address: expectedAddress,
                fullName: 'Some address full string',
                registrationDate: new Date(),
            }

            jest.spyOn(registrationAddressDataMapperMock, 'toRegistrationInfo').mockReturnValueOnce(expectedResult)

            expect(passportByInnDataMapper.toRegistration(passportByInn)).toEqual(expectedResult)

            expect(registrationAddressDataMapperMock.toRegistrationInfo).toHaveBeenCalledWith(expectedAddress, 'DD.MM.YYYY')
        })
    })

    describe('method toPassportByInnRegistrationFromPassportRegistration', () => {
        it('should successfully compose and return registration', () => {
            const passportRegistrationInfo = {
                address: {
                    addressGromKatottg: 'UA80000000000093317',
                    addressKatottg: 'UA80000000000093317',
                    addressKoatuu: '',
                    apartment: '69',
                    buildingNumber: '11',
                    buildingPart: '',
                    cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                    cityDistrictKatottg: 'UA80000000001078669',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                    country: 'УКРАЇНА',
                    postbox: '',
                    region: '',
                    regionDistrict: '',
                    regionDistrictName: '',
                    regionName: '',
                    registrationDate: '20.07.1969',
                    settlementName: 'КИЇВ',
                    settlementType: 'М.',
                    streetName: 'АРМСТРОНГА',
                    streetType: 'ВУЛ.',
                },
                fullName: 'Some address full string',
                registrationDate: new Date(),
            }

            expect(passportByInnDataMapper.toPassportByInnRegistrationFromPassportRegistration(passportRegistrationInfo)).toEqual({
                address: {
                    registration_inf: !!passportRegistrationInfo.fullName,
                    postbox: passportRegistrationInfo.address.postbox,
                    address_koatuu: passportRegistrationInfo.address.addressKoatuu,
                    address_katottg: passportRegistrationInfo.address.addressKatottg,
                    address_grom_katottg: passportRegistrationInfo.address.addressGromKatottg,
                    region: passportRegistrationInfo.address.region,
                    regionName: passportRegistrationInfo.address.regionName,
                    district: passportRegistrationInfo.address.regionDistrict,
                    districtName: passportRegistrationInfo.address.regionDistrictName,
                    city_district: passportRegistrationInfo.address.cityDistrict,
                    cityDistrictName: passportRegistrationInfo.address.cityDistrictName,
                    settlement_district_katottg: passportRegistrationInfo.address.cityDistrictKatottg,
                    settlement_name: passportRegistrationInfo.address.settlementName,
                    settlement_type: passportRegistrationInfo.address.settlementType,
                    street_name: passportRegistrationInfo.address.streetName,
                    street_type: passportRegistrationInfo.address.streetType,
                    building_number: passportRegistrationInfo.address.buildingNumber,
                    building_part: passportRegistrationInfo.address.buildingPart,
                    apartment: passportRegistrationInfo.address.apartment,
                    registration_date: passportRegistrationInfo.address.registrationDate,
                    cancelregistration_date: '',
                },
                registrationDate: passportRegistrationInfo.registrationDate,
                deregistrationDate: undefined,
                fullName: passportRegistrationInfo.fullName,
            })
        })
    })
})
