import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import DocumentsEisMockProvider from '@providers/eis/documentsEisMock'
import { passportEisSuccessResponse } from '@providers/testData/documentsMockData'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

describe('DocumentsEisMockProvider', () => {
    const testKit = new TestKit()
    const passportDataMapperMock = mockInstance(PassportDataMapper)
    const utilsMock = mockInstance(Utils)
    const loggerMock = mockInstance(DiiaLogger)
    const documentsEisMockProvider = new DocumentsEisMockProvider(passportDataMapperMock, utilsMock, loggerMock)
    const { user } = testKit.session.getUserSession()
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
        it('should successfully return mocked registry passport dto', async () => {
            const result = await documentsEisMockProvider.getPassports()

            expect(result).toEqual(passportEisSuccessResponse)
        })
    })

    describe('method getPassportFull', () => {
        it('should successfully map and return mocked full passport data', async () => {
            const expectedResult = {
                data: [],
            }

            jest.spyOn(passportDataMapperMock, 'toFullEntity').mockReturnValueOnce(expectedResult)

            const result = await documentsEisMockProvider.getPassportFull()

            expect(result).toEqual(expectedResult)

            expect(passportDataMapperMock.toFullEntity).toHaveBeenCalledWith(passportEisSuccessResponse)
        })
    })

    describe('method collectRequestData', () => {
        it('should successfully return passport request data', async () => {
            jest.spyOn(utilsMock, 'collectPerson').mockReturnValueOnce(person)
            jest.spyOn(utilsMock, 'collectRepresentative').mockReturnValueOnce(representative)

            const expectedResult = {
                person,
                representative,
            }

            const result = documentsEisMockProvider.collectRequestData(user)

            expect(result).toEqual(expectedResult)

            expect(utilsMock.collectPerson).toHaveBeenCalledWith(user)
            expect(utilsMock.collectRepresentative).toHaveBeenCalledWith(user)
        })
    })
})
