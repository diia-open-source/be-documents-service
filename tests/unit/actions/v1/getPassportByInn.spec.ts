import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetPassportByInnAction from '@actions/v1/getPassportByInn'

import PassportService from '@services/passport'

import PassportByInnDataMapper from '@dataMappers/passportByInnDataMapper'

import { getPassportWithRegistration } from '@tests/mocks/stubs/passport'

describe(`Action ${GetPassportByInnAction.name}`, () => {
    const testKit = new TestKit()
    const passportService = mockInstance(PassportService)
    const passportByInnDataMapper = mockInstance(PassportByInnDataMapper)
    const action = new GetPassportByInnAction(passportService, passportByInnDataMapper)

    it('should return passport by inn', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                digitalPassportRegistration: true,
            },
            headers,
            session,
        }

        const passportByInn = getPassportWithRegistration()

        jest.spyOn(passportService, 'getPassportByInn').mockResolvedValueOnce(passportByInn)
        jest.spyOn(passportService, 'getRegistration').mockResolvedValueOnce(undefined)

        expect(await action.handler(args)).toMatchObject({ passport: passportByInn.passport, registration: passportByInn.registrationV1 })
        expect(passportService.getPassportByInn).toHaveBeenCalledWith(args.session.user)
        expect(passportService.getRegistration).toHaveBeenCalledWith(args.session.user, ['passport'])
    })

    it('should return passport by inn with registration', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                digitalPassportRegistration: true,
            },
            headers,
            session,
        }

        const passportByInn = getPassportWithRegistration()

        const registration = {
            address: {
                country: 'country',
                postbox: 'postbox',
                addressKoatuu: 'addressKoatuu',
                addressKatottg: 'addressKatottg',
                addressGromKatottg: 'addressGromKatottg',
                region: 'region',
                regionName: 'regionName',
                regionDistrict: 'regionDistrict',
                regionDistrictName: 'regionDistrictName',
                cityDistrict: 'cityDistrict',
                cityDistrictName: 'cityDistrictName',
                cityDistrictKatottg: 'cityDistrictKatottg',
                settlementName: 'settlementName',
                settlementType: 'settlementType',
                streetName: 'streetName',
                streetType: 'streetType',
                buildingNumber: 'buildingNumber',
                buildingPart: 'buildingPart',
                apartment: 'apartment',
                registrationDate: 'registrationDate',
                cancelregistrationDate: 'cancelregistrationDate',
            },
        }

        const expectedMappedData = passportByInnDataMapper.toPassportByInnRegistrationFromPassportRegistration(registration)

        jest.spyOn(passportService, 'getPassportByInn').mockResolvedValueOnce(passportByInn)
        jest.spyOn(passportService, 'getRegistration').mockResolvedValueOnce(registration)

        expect(await action.handler(args)).toMatchObject({
            passport: passportByInn.passport,
            registration: expectedMappedData,
        })
        expect(passportService.getPassportByInn).toHaveBeenCalledWith(args.session.user)
        expect(passportService.getRegistration).toHaveBeenCalledWith(args.session.user, ['passport'])
    })
})
