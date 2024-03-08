import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetDriverLicenseAction from '@src/documents/driverLicense/actions/v1/getDriverLicense'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

import DocumentsExpirationService from '@services/documentsExpiration'

describe(`Action ${GetDriverLicenseAction.name}`, () => {
    const testKit = new TestKit()
    const documentsExpirationService = mockInstance(DocumentsExpirationService)
    const driverLicenseService = mockInstance(DriverLicenseService)
    const action = new GetDriverLicenseAction(documentsExpirationService, driverLicenseService)

    it('should return document verification by barcode', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = { session, headers }

        const driversLicense = {
            driverLicense: [
                {
                    id: 1,
                    dend: 'dend',
                    categories: ['category'],
                    sdoc: 'sdoc',
                    ndoc: 'ndoc',
                    department: {
                        ID: 'ID',
                        VALUE: 'VALUE',
                    },
                    photo: 'photo',
                    status: {
                        ID: 'ID',
                        VALUE: 'VALUE',
                    },
                },
            ],
            client: {
                inn: 3016906409,
                innChar: '3016906409',
                clientId: 20997134,
                lastNameUA: 'ДІЯ',
                firstNameUA: 'НАДІЯ',
                middleNameUA: 'ВОЛОДИМИРІВНА',
                lastNameRU: 'lastNameRU',
                firstNameRU: 'firstNameRU',
                middleNameRU: 'middleNameRU',
                lastNameEN: 'lastNameEN',
                firstNameEN: 'firstNameEN',
                middleNameEN: 'middleNameEN',
                birthday: '1997-02-21',
                country: {
                    ID: '227',
                    VALUE: 'УКРАЇНА',
                },
                sex: {
                    ID: 'F',
                    VALUE: 'ЖІНОЧА',
                },
                person: {
                    ID: 'P',
                    VALUE: 'ФІЗИЧНА ОСОБА',
                },
            },
            clientAddr: [],
        }

        const currentDate: string = new Date().toISOString()
        const expirationDate: string = new Date(Date.now() * 1000).toISOString()
        const expResult = { currentDate, expirationDate }
        const result = { ...driversLicense, ...expResult }

        jest.spyOn(driverLicenseService, 'getDriverLicenseFull').mockResolvedValueOnce(driversLicense)
        jest.spyOn(documentsExpirationService, 'generateMetaData').mockReturnValueOnce(expResult)

        expect(await action.handler(args)).toMatchObject(result)
        expect(driverLicenseService.getDriverLicenseFull).toHaveBeenCalledWith(args.session.user.itn)
        expect(documentsExpirationService.generateMetaData).toHaveBeenCalledWith()
    })
})
