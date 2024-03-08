import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { ExternalCommunicatorError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import GetINternalPassportWithRegistrationAction from '@src/actions/v1/getInternalPassportWithRegistration'

import { getPassportByInn } from '@tests/mocks/stubs/providers/dms/passportByInn'
import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/getInternalPassportWithRegistration'
import { RegistryPassportRegistration, RegistryPassportsByInn } from '@interfaces/dto'

describe(`Action ${GetINternalPassportWithRegistrationAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetINternalPassportWithRegistrationAction
    let external: ExternalCommunicator

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetINternalPassportWithRegistrationAction)
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
                    country: 'УКРАЇНА',
                    postbox: '84110',
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

    it('should return registration from digital passport when digitalPassportRegistration passed', async () => {
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
                country: 'УКРАЇНА',
                postbox: '84110',
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
        })
    })

    it('should return registration from passportByInn when has no registration from digital passport', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        jest.spyOn(external, 'receive').mockResolvedValueOnce(getPassportByInn())
        jest.spyOn(external, 'receiveDirect').mockRejectedValueOnce(new ExternalCommunicatorError('Not found', HttpStatusCode.NOT_FOUND))

        // Act
        const result = await action.handler({ session, headers, params: { digitalPassportRegistration: true } })

        // Assert
        expect(result.registration).toEqual<ActionResult['registration']>({
            address: {
                country: 'УКРАЇНА',
                postbox: '84110',
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
        })
    })
})
