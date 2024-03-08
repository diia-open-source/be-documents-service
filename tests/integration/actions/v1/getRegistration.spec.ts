import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { ExternalCommunicatorError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import GetRegistrationAction from '@src/actions/v1/getRegistration'

import { getPassportByInn } from '@tests/mocks/stubs/providers/dms/passportByInn'
import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/getRegistration'
import { RegistryPassportRegistration, RegistryPassportsByInnRegistration } from '@interfaces/dto'

describe(`Action ${GetRegistrationAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetRegistrationAction
    let external: ExternalCommunicator

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetRegistrationAction)
        external = app.container.resolve('external')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('Source: passport', () => {
        it('should return registration when has registration in passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportRegistration = {
                cbc_country: 'УКРАЇНА',
                country_id: 804,
                postbox: '',
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

            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport({ registration }))
            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())

            // Act
            const result = await action.handler({ session, headers })

            // Assert
            expect(result).toEqual<ActionResult>({
                registration: {
                    address: {
                        country: 'УКРАЇНА',
                        postbox: '',
                        addressKoatuu: '',
                        addressKatottg: 'UA80000000000093317',
                        addressGromKatottg: 'UA80000000000093317',
                        region: '',
                        regionName: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        cityDistrictKatottg: 'UA80000000001078669',
                        settlementName: 'КИЇВ',
                        settlementType: 'М.',
                        streetName: 'АРМСТРОНГА',
                        streetType: 'ВУЛ.',
                        buildingNumber: '11',
                        buildingPart: '',
                        apartment: '69',
                        registrationDate: '20.07.1969',
                    },
                    registrationDate: expect.any(Date),
                    fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                },
            })
        })

        it('should return registration with deregistration date when has canceled registration in passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportRegistration = {
                cbc_country: 'УКРАЇНА',
                country_id: 804,
                postbox: '',
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
                registration_date: null,
                cancelregistration_date: '20.07.1969',
            }

            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport({ registration }))
            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())

            // Act
            const result = await action.handler({ session, headers })

            // Assert
            expect(result).toEqual<ActionResult>({
                registration: {
                    address: {
                        country: 'УКРАЇНА',
                        postbox: '',
                        addressKoatuu: '',
                        addressKatottg: 'UA80000000000093317',
                        addressGromKatottg: 'UA80000000000093317',
                        region: '',
                        regionName: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        cityDistrictKatottg: 'UA80000000001078669',
                        settlementName: 'КИЇВ',
                        settlementType: 'М.',
                        streetName: 'АРМСТРОНГА',
                        streetType: 'ВУЛ.',
                        buildingNumber: '11',
                        buildingPart: '',
                        apartment: '69',
                        cancelregistrationDate: '20.07.1969',
                    },
                    deregistrationDate: expect.any(Date),
                },
            })
        })

        it('should return registration without registration date when has no registration in passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportRegistration = {
                cbc_country: '',
                country_id: null,
                postbox: '',
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

            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport({ registration }))
            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())

            // Act
            const result = await action.handler({ session, headers })

            // Assert
            expect(result).toEqual<ActionResult>({
                registration: {
                    address: {
                        country: '',
                        postbox: '',
                        addressKoatuu: '',
                        addressKatottg: '',
                        addressGromKatottg: '',
                        region: '',
                        regionName: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        cityDistrict: '',
                        cityDistrictName: '',
                        cityDistrictKatottg: '',
                        settlementName: '',
                        settlementType: '',
                        streetName: '',
                        streetType: '',
                        buildingNumber: '',
                        buildingPart: '',
                        apartment: '',
                    },
                },
            })
        })
    })

    describe('Source: passportByInn', () => {
        it('should return registration when has registration in passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportsByInnRegistration = {
                registration_inf: true,
                postbox: '',
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
            }

            jest.spyOn(external, 'receiveDirect').mockRejectedValueOnce(
                new ExternalCommunicatorError('Not found', HttpStatusCode.NOT_FOUND),
            )
            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn({ return: { registration } }))

            // Act
            const result = await action.handler({ session, headers })

            // Assert
            expect(result).toEqual<ActionResult>({
                registration: {
                    address: {
                        country: 'УКРАЇНА',
                        postbox: '',
                        addressKoatuu: '',
                        addressKatottg: 'UA80000000000093317',
                        addressGromKatottg: 'UA80000000000093317',
                        region: '',
                        regionName: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        cityDistrictKatottg: 'UA80000000001078669',
                        settlementName: 'КИЇВ',
                        settlementType: 'М.',
                        streetName: 'АРМСТРОНГА',
                        streetType: 'ВУЛ.',
                        buildingNumber: '11',
                        buildingPart: '',
                        apartment: '69',
                        registrationDate: '20.07.1969',
                        cancelregistrationDate: '',
                    },
                    registrationDate: expect.any(Date),
                    fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                },
            })
        })

        it('should return registration with deregistration date when has canceled registration in passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportsByInnRegistration = {
                registration_inf: true,
                postbox: '',
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

            jest.spyOn(external, 'receiveDirect').mockRejectedValueOnce(
                new ExternalCommunicatorError('Not found', HttpStatusCode.NOT_FOUND),
            )
            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn({ return: { registration } }))

            // Act
            const result = await action.handler({ session, headers })

            // Assert
            expect(result).toEqual<ActionResult>({
                registration: {
                    address: {
                        country: 'УКРАЇНА',
                        postbox: '',
                        addressKoatuu: '',
                        addressKatottg: 'UA80000000000093317',
                        addressGromKatottg: 'UA80000000000093317',
                        region: '',
                        regionName: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        cityDistrict: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
                        cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                        cityDistrictKatottg: 'UA80000000001078669',
                        settlementName: 'КИЇВ',
                        settlementType: 'М.',
                        streetName: 'АРМСТРОНГА',
                        streetType: 'ВУЛ.',
                        buildingNumber: '11',
                        buildingPart: '',
                        apartment: '69',
                        cancelregistrationDate: '20.07.1969',
                        registrationDate: '',
                    },
                    deregistrationDate: expect.any(Date),
                },
            })
        })

        it('should return registration without registration date when has no registration in passport', async () => {
            // Arrange
            const headers = testKit.session.getHeaders()
            const session = testKit.session.getUserSession()

            const registration: RegistryPassportsByInnRegistration = {
                registration_inf: false,
                postbox: '',
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

            jest.spyOn(external, 'receiveDirect').mockRejectedValueOnce(
                new ExternalCommunicatorError('Not found', HttpStatusCode.NOT_FOUND),
            )
            jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn({ return: { registration } }))

            // Act
            const result = await action.handler({ session, headers })

            // Assert
            expect(result).toEqual<ActionResult>({
                registration: {
                    address: {
                        country: 'УКРАЇНА',
                        postbox: '',
                        addressKoatuu: '',
                        addressKatottg: '',
                        addressGromKatottg: '',
                        region: '',
                        regionName: '',
                        regionDistrict: '',
                        regionDistrictName: '',
                        cityDistrict: '',
                        cityDistrictName: '',
                        cityDistrictKatottg: '',
                        settlementName: '',
                        settlementType: '',
                        streetName: '',
                        streetType: '',
                        buildingNumber: '',
                        buildingPart: '',
                        apartment: '',
                        cancelregistrationDate: '',
                        registrationDate: '',
                    },
                },
            })
        })
    })

    it('should not return registration when has no registration in any source', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        jest.spyOn(external, 'receiveDirect').mockRejectedValueOnce(new ExternalCommunicatorError('Not found', HttpStatusCode.NOT_FOUND))
        jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn({ success: 404 }))

        // Act
        const result = await action.handler({ session, headers })

        // Assert
        expect(result).toEqual<ActionResult>({})
    })
})
