import DiiaLogger from '@diia-inhouse/diia-logger'
import { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import DocumentSettingsService from '@services/documentSettings'

import documentSettingModel from '@models/documentSetting'

import { DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'

describe('DocumentSettingsService', () => {
    const loggerMock = mockInstance(DiiaLogger)
    const documentSettingsService = new DocumentSettingsService(loggerMock)

    describe('method: getDocumentExpirationTime', () => {
        const type = <DocumentType>'document-type'
        const expirationType = ExpirationType.Success
        const version = DocumentSettingVersion.V1

        it.each([
            [
                0,
                (): void => {
                    jest.spyOn(documentSettingModel, 'findOne').mockResolvedValueOnce(null)
                },
                (): void => {
                    expect(documentSettingModel.findOne).toHaveBeenCalledWith({ type, version })
                    expect(loggerMock.error).toHaveBeenCalledWith(`There is no document settings`, { type, version })
                },
            ],
            [
                30000,
                (): void => {
                    jest.spyOn(documentSettingModel, 'findOne').mockResolvedValueOnce({ expirationTime: { [expirationType]: 30000 } })
                },
                (): void => {
                    expect(documentSettingModel.findOne).toHaveBeenCalledWith({ type, version })
                },
            ],
            [30000],
        ])(
            'should return document expiration time as %s',
            async (expectedExpirationTime, defineSpecificSpies = (): void => {}, checkSpecificExpectations = (): void => {}) => {
                defineSpecificSpies()

                const result = await documentSettingsService.getDocumentExpirationTime(type, expirationType, version)

                expect(result).toEqual(expectedExpirationTime)

                checkSpecificExpectations()
            },
        )
    })
})
