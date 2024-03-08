import { pick } from 'lodash'

import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetUserByITNAction from '@actions/v1/getUserByITN'

import DocumentsExpirationService from '@services/documentsExpiration'

import { TaxPayerDTO } from '@interfaces/actions/v1/getUserByITN'
import { AppConfig } from '@interfaces/config'

describe(`Action ${GetUserByITNAction.name}`, () => {
    const testKit = new TestKit()
    const documentsExpirationService = mockInstance(DocumentsExpirationService)

    it('should return tax payer info with itn data', async () => {
        const appConfig = <AppConfig>(<unknown>{
            returnItnDataIsEnabled: true,
        })
        const action = new GetUserByITNAction(documentsExpirationService, appConfig)

        const { headers, session } = testKit.session.getUserActionArguments()

        const defaultTaxPayer: TaxPayerDTO = {
            fName: '',
            mName: '',
            lName: '',
            itn: '',
            birthDay: '',
        }

        const returnItnDataIsEnabled: boolean = appConfig.returnItnDataIsEnabled
        // eslint-disable-next-line jest/no-conditional-in-test
        const fieldsToFill: string[] = returnItnDataIsEnabled ? ['fName', 'mName', 'lName', 'itn', 'birthDay'] : ['fName']
        const taxPayer: TaxPayerDTO = { ...defaultTaxPayer, ...pick(session.user, fieldsToFill) }

        const currentDate: string = new Date().toISOString()
        const expirationDate: string = new Date(Date.now() * 1000).toISOString()
        const expResult = { currentDate, expirationDate }
        const result = { ...taxPayer, ...expResult }

        jest.spyOn(documentsExpirationService, 'generateMetaData').mockReturnValueOnce(expResult)

        expect(await action.handler({ headers, session })).toMatchObject(result)
        expect(documentsExpirationService.generateMetaData).toHaveBeenCalledWith()
    })

    it('should return tax payer info without itn data', async () => {
        const appConfig = <AppConfig>(<unknown>{
            returnItnDataIsEnabled: false,
        })
        const action = new GetUserByITNAction(documentsExpirationService, appConfig)

        const { headers, session } = testKit.session.getUserActionArguments()

        const defaultTaxPayer: TaxPayerDTO = {
            fName: '',
            mName: '',
            lName: '',
            itn: '',
            birthDay: '',
        }

        const returnItnDataIsEnabled: boolean = appConfig.returnItnDataIsEnabled
        // eslint-disable-next-line jest/no-conditional-in-test
        const fieldsToFill: string[] = returnItnDataIsEnabled ? ['fName', 'mName', 'lName', 'itn', 'birthDay'] : ['fName']
        const taxPayer: TaxPayerDTO = { ...defaultTaxPayer, ...pick(session.user, fieldsToFill) }

        const currentDate: string = new Date().toISOString()
        const expirationDate: string = new Date(Date.now() * 1000).toISOString()
        const expResult = { currentDate, expirationDate }
        const result = { ...taxPayer, ...expResult }

        jest.spyOn(documentsExpirationService, 'generateMetaData').mockReturnValueOnce(expResult)

        expect(await action.handler({ headers, session })).toMatchObject(result)
        expect(documentsExpirationService.generateMetaData).toHaveBeenCalledWith()
    })
})
