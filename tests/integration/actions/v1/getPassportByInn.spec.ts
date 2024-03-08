import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { ExternalCommunicatorError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import GetPassportByInnAction from '@src/actions/v1/getPassportByInn'

import { getPassportByInn } from '@tests/mocks/stubs/providers/dms/passportByInn'
import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/getPassportByInn'
import { RegistryPassportRegistration, RegistryPassportsByInn, RegistryPassportsByInnRegistration } from '@interfaces/dto'

describe(`Action ${GetPassportByInnAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetPassportByInnAction
    let external: ExternalCommunicator

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetPassportByInnAction)
        external = app.container.resolve('external')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return passport with registration', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        const passportByInn = getPassportByInn()
        const passport = <RegistryPassportsByInn>passportByInn.return

        jest.spyOn(external, 'receive').mockResolvedValueOnce(passportByInn)

        // Act
        const result = await action.handler({ session, headers, params: {} })

        // Assert
        expect(result).toEqual<ActionResult>({
            passport: {
                lastNameUA: passport.last_name,
                firstNameUA: passport.first_name,
                middleNameUA: passport.middle_name,
                recordNumber: passport.unzr,
                genderEN: passport.gender,
                birthday: passport.date_birth,
                birthCountry: passport.birth_country,
                birthPlaceUA: passport.birth_place,
                type: passport.documents.type,
                docSerial: passport.documents.documentSerial,
                docNumber: passport.documents.number,
                issueDate: passport.documents.date_issue,
                expirationDate: passport.documents.date_expiry,
                department: passport.documents.dep_issue,
            },
            registration: {
                address: {
                    registration_inf: true,
                    postbox: '84110',
                    address_grom_katottg: 'UA80000000000093317',
                    address_koatuu: '',
                    address_katottg: 'UA80000000000093317',
                    region: '',
                    district: '',
                    settlement_name: 'КИЇВ',
                    settlement_type: 'М.',
                    city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                    settlement_district_katottg: 'UA80000000001078669',
                    street_name: 'АРМСТРОНГА',
                    street_type: 'ВУЛ.',
                    building_number: '11',
                    building_part: '',
                    apartment: '69',
                    registration_date: '20.07.1969',
                    cancelregistration_date: '',
                    regionName: '',
                    districtName: '',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                },
                registrationDate: expect.any(Date),
                fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
            },
        })
    })

    it('should return registration with deregistration date when has canceled registration', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        const registration: RegistryPassportsByInnRegistration = {
            registration_inf: true,
            postbox: '84110',
            address_grom_katottg: 'UA80000000000093317',
            address_koatuu: '',
            address_katottg: 'UA80000000000093317',
            region: '',
            district: '',
            settlement_name: 'КИЇВ',
            settlement_type: 'М.',
            city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
            settlement_district_katottg: 'UA80000000001078669',
            street_name: 'АРМСТРОНГА',
            street_type: 'ВУЛ.',
            building_number: '11',
            building_part: '',
            apartment: '69',
            registration_date: '',
            cancelregistration_date: '20.07.1969',
        }

        jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn({ return: { registration } }))

        // Act
        const result = await action.handler({ session, headers, params: {} })

        // Assert
        expect(result.registration).toEqual<ActionResult['registration']>({
            address: {
                registration_inf: true,
                postbox: '84110',
                address_grom_katottg: 'UA80000000000093317',
                address_koatuu: '',
                address_katottg: 'UA80000000000093317',
                region: '',
                district: '',
                settlement_name: 'КИЇВ',
                settlement_type: 'М.',
                city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                settlement_district_katottg: 'UA80000000001078669',
                street_name: 'АРМСТРОНГА',
                street_type: 'ВУЛ.',
                building_number: '11',
                building_part: '',
                apartment: '69',
                registration_date: '',
                cancelregistration_date: '20.07.1969',
                regionName: '',
                districtName: '',
                cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
            },
            deregistrationDate: expect.any(Date),
        })
    })

    it('should return registration without registration date when has no registration', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        const registration: RegistryPassportsByInnRegistration = {
            registration_inf: false,
            postbox: '84110',
            address_grom_katottg: '',
            address_koatuu: '',
            address_katottg: '',
            region: '',
            district: '',
            settlement_name: '',
            settlement_type: '',
            city_district: '',
            settlement_district_katottg: '',
            street_name: '',
            street_type: '',
            building_number: '',
            building_part: '',
            apartment: '',
            registration_date: '',
            cancelregistration_date: '',
        }

        jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn({ return: { registration } }))

        // Act
        const result = await action.handler({ session, headers, params: {} })

        // Assert
        expect(result.registration).toEqual<ActionResult['registration']>({
            address: {
                registration_inf: false,
                postbox: '84110',
                address_grom_katottg: '',
                address_koatuu: '',
                address_katottg: '',
                region: '',
                district: '',
                settlement_name: '',
                settlement_type: '',
                city_district: '',
                settlement_district_katottg: '',
                street_name: '',
                street_type: '',
                building_number: '',
                building_part: '',
                apartment: '',
                registration_date: '',
                cancelregistration_date: '',
                regionName: '',
                districtName: '',
                cityDistrictName: '',
            },
        })
    })

    describe('With digitalPassportRegistration', () => {
        it('should return registration from digital passport when has registration', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportRegistration = {
                cbc_country: 'УКРАЇНА',
                country_id: 804,
                postbox: '84110',
                address_grom_katottg: 'UA80000000000093317',
                address_koatuu: '',
                address_katotth: 'UA80000000000093317',
                region: '',
                region_district: '',
                city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                settlement_district_katottg: 'UA80000000001078669',
                settlement_name: 'КИЇВ',
                settlement_type: 'М.',
                street_name: 'АРМСТРОНГА',
                street_type: 'ВУЛ.',
                building_number: '11',
                building_part: '',
                apartment: '69',
                registration_date: '20.07.1969',
                cancelregistration_date: null,
            }

            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())
            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport({ registration }))

            // Act
            const result = await action.handler({ session, headers, params: { digitalPassportRegistration: true } })

            // Assert
            expect(result.registration).toEqual<ActionResult['registration']>({
                address: {
                    registration_inf: true,
                    postbox: '84110',
                    address_grom_katottg: 'UA80000000000093317',
                    address_koatuu: '',
                    address_katottg: 'UA80000000000093317',
                    region: '',
                    district: '',
                    settlement_name: 'КИЇВ',
                    settlement_type: 'М.',
                    city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                    settlement_district_katottg: 'UA80000000001078669',
                    street_name: 'АРМСТРОНГА',
                    street_type: 'ВУЛ.',
                    building_number: '11',
                    building_part: '',
                    apartment: '69',
                    registration_date: '20.07.1969',
                    cancelregistration_date: '',
                    regionName: '',
                    districtName: '',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                },
                registrationDate: expect.any(Date),
                fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
            })
        })

        it('should return registration without registration date from digital passport when has no registration', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportRegistration = {
                cbc_country: '',
                country_id: null,
                postbox: '84110',
                address_grom_katottg: '',
                address_koatuu: '',
                address_katotth: '',
                region: '',
                region_district: '',
                city_district: '',
                settlement_district_katottg: '',
                settlement_name: '',
                settlement_type: '',
                street_name: '',
                street_type: '',
                building_number: '',
                building_part: '',
                apartment: '',
                registration_date: null,
                cancelregistration_date: null,
            }

            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())
            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport({ registration }))

            // Act
            const result = await action.handler({ session, headers, params: { digitalPassportRegistration: true } })

            // Assert
            expect(result.registration).toEqual<ActionResult['registration']>({
                address: {
                    registration_inf: false,
                    postbox: '84110',
                    address_grom_katottg: '',
                    address_koatuu: '',
                    address_katottg: '',
                    region: '',
                    district: '',
                    settlement_name: '',
                    settlement_type: '',
                    city_district: '',
                    settlement_district_katottg: '',
                    street_name: '',
                    street_type: '',
                    building_number: '',
                    building_part: '',
                    apartment: '',
                    registration_date: '',
                    cancelregistration_date: '',
                    regionName: '',
                    districtName: '',
                    cityDistrictName: '',
                },
            })
        })

        it('should return registration from passportByInn when has no registration from digital passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())
            jest.spyOn(external, 'receiveDirect').mockRejectedValueOnce(
                new ExternalCommunicatorError('Not found', HttpStatusCode.NOT_FOUND),
            )

            // Act
            const result = await action.handler({ session, headers, params: { digitalPassportRegistration: true } })

            // Assert
            expect(result.registration).toEqual<ActionResult['registration']>({
                address: {
                    registration_inf: true,
                    postbox: '84110',
                    address_grom_katottg: 'UA80000000000093317',
                    address_koatuu: '',
                    address_katottg: 'UA80000000000093317',
                    region: '',
                    district: '',
                    settlement_name: 'КИЇВ',
                    settlement_type: 'М.',
                    city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                    settlement_district_katottg: 'UA80000000001078669',
                    street_name: 'АРМСТРОНГА',
                    street_type: 'ВУЛ.',
                    building_number: '11',
                    building_part: '',
                    apartment: '69',
                    registration_date: '20.07.1969',
                    cancelregistration_date: '',
                    regionName: '',
                    districtName: '',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                },
                registrationDate: expect.any(Date),
                fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
            })
        })
    })
})
