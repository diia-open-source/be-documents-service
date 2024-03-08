import { DeleteResult } from 'mongodb'
import { UpdateWriteOpResult } from 'mongoose'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentType, DurationMs, OwnerType, PassportType } from '@diia-inhouse/types'

import DocumentSettingsService from '@services/documentSettings'
import DocumentsExpirationService from '@services/documentsExpiration'

import documentsExpirationModel from '@models/documentsExpiration'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import PluginDepsCollectionMock, { getDocumentExpirationService } from '@mocks/stubs/documentDepsCollection'

import { AppConfig } from '@interfaces/config'
import { DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'

describe('DocumentsExpirationService', () => {
    const testKit = new TestKit()
    const documentSettingsServiceMock = mockInstance(DocumentSettingsService)
    const passportDataMapperMock = mockInstance(PassportDataMapper)
    const config = <AppConfig>{
        app: {
            defaultDocumentExpirationTime: 30000,
            isDocumentsExpirationEnabled: true,
        },
    }
    const loggerMock = mockInstance(DiiaLogger)
    const documentsExpirationService = new DocumentsExpirationService(
        new PluginDepsCollectionMock([getDocumentExpirationService()]),
        documentSettingsServiceMock,
        passportDataMapperMock,
        config,
        loggerMock,
    )
    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const { identifier: userIdentifier } = user
    const { mobileUid } = headers
    const now = new Date()

    beforeAll(() => {
        jest.useFakeTimers({ now })
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    describe('method getDocumentsExpiration', () => {
        it('should successfully get documents expiration', async () => {
            jest.spyOn(documentsExpirationModel, 'findOne').mockResolvedValueOnce(documentsExpirationModel)

            const result = await documentsExpirationService.getDocumentsExpiration(mobileUid, userIdentifier)

            expect(result).toEqual(documentsExpirationModel)

            expect(documentsExpirationModel.findOne).toHaveBeenCalledWith({ mobileUid, userIdentifier })
        })
    })

    describe('method getDocumentIdsExpiration', () => {
        it('should successfully get document ids expiration', async () => {
            const documentType = <DocumentType>'document-type'
            const documentExpiration = new documentsExpirationModel({
                [documentType]: {
                    date: new Date(),
                    statuses: [
                        {
                            ownerType: OwnerType.owner,
                            value: DocStatus.Ok,
                        },
                    ],
                },
            })
            const query = documentsExpirationModel.where()

            jest.spyOn(documentsExpirationModel, 'find').mockReturnValueOnce(query)
            jest.spyOn(query, 'sort').mockResolvedValueOnce([documentExpiration])

            const result = await documentsExpirationService.getDocumentIdsExpiration(mobileUid, userIdentifier, documentType)

            expect(result).toEqual(documentExpiration[documentType])

            expect(documentsExpirationModel.find).toHaveBeenCalledWith({ mobileUid, userIdentifier }, { [documentType]: 1 })
            expect(query.sort).toHaveBeenCalledWith({ _id: -1 })
        })
    })

    describe('method collectDocumentExpirationModifier', () => {
        it.each([
            [
                'custom expiration time is present and document is without expiration per user',
                DocumentType.LocalVaccinationCertificate,
                [],
                ExpirationType.Success,
                1800000,
                { expirationTime: 1800000 },
            ],
            [
                'custom expiration time is not present and document is without expiration per user',
                DocumentType.LocalVaccinationCertificate,
                [],
                ExpirationType.Success,
                undefined,
                { expirationTime: 1800000 },
                (): void => {
                    jest.spyOn(documentSettingsServiceMock, 'getDocumentExpirationTime').mockResolvedValueOnce(1800000)
                },
                (): void => {
                    expect(documentSettingsServiceMock.getDocumentExpirationTime).toHaveBeenCalledWith(
                        DocumentType.LocalVaccinationCertificate,
                        ExpirationType.Success,
                        DocumentSettingVersion.V1,
                    )
                },
            ],
            [
                'custom expiration time is present and document is with expiration per user',
                <DocumentType>'document-type-3',
                [{ id: 'id', ownerType: OwnerType.owner, status: DocStatus.Ok }],
                ExpirationType.Success,
                1800000,
                {
                    expirationTime: 1800000,
                    modifier: {
                        ['document-type-3.date']: new Date(now.getTime() + 1800000 * 1000),
                        ['document-type-3.statuses.id']: { value: DocStatus.Ok, ownerType: OwnerType.owner },
                    },
                },
            ],
        ])(
            'should successfully collect document expiration modifier in case %s',
            async (
                _msg,
                documentType,
                documentStatuses,
                expirationType,
                customExpirationTime,
                expectedResult,
                defineSpecificSpies = (): void => {},
                checkSpecificExpectations = (): void => {},
            ) => {
                defineSpecificSpies()

                const result = await documentsExpirationService.collectDocumentExpirationModifier(
                    documentType,
                    documentStatuses,
                    expirationType,
                    customExpirationTime,
                )

                expect(result).toEqual(expectedResult)

                checkSpecificExpectations()
            },
        )
    })

    describe('method performDocumentsExpirationUpdate', () => {
        it('should successfully perform documents expiration update', async () => {
            const modifier = {
                ['document-type.date']: new Date(now.getTime() + 1800000 * 1000),
                ['document-type.statuses.id']: { value: DocStatus.Ok, ownerType: OwnerType.owner },
            }

            jest.spyOn(documentsExpirationModel, 'updateOne').mockResolvedValueOnce(<UpdateWriteOpResult>{ modifiedCount: 1 })

            await documentsExpirationService.performDocumentsExpirationUpdate(mobileUid, userIdentifier, modifier)

            expect(loggerMock.debug).toHaveBeenCalledWith('Updating documents expiration time', modifier)
            expect(documentsExpirationModel.updateOne).toHaveBeenCalledWith({ mobileUid, userIdentifier }, modifier, { upsert: true })
        })

        it('should skip to perform documents expiration update in case modifier is empty', async () => {
            const modifier = {}

            jest.spyOn(documentsExpirationModel, 'updateOne').mockResolvedValueOnce(<UpdateWriteOpResult>{ modifiedCount: 1 })

            await documentsExpirationService.performDocumentsExpirationUpdate(mobileUid, userIdentifier, modifier)

            expect(loggerMock.debug).toHaveBeenCalledWith('Updating documents expiration time', modifier)
            expect(documentsExpirationModel.updateOne).not.toHaveBeenCalledWith({ mobileUid, userIdentifier }, modifier, { upsert: true })
        })
    })

    describe('method removeUserExpirationsByMobileUid', () => {
        it.each([
            [
                0,
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('Failed to find user document expiration', { mobileUid, userIdentifier })
                },
            ],
            [
                1,
                (): void => {
                    expect(loggerMock.info).toHaveBeenCalledWith('Successfully removed user document expiration', {
                        mobileUid,
                        userIdentifier,
                    })
                },
            ],
        ])('should successfully run remove process when deleted count is %s', async (deletedCount, checkExpectations) => {
            jest.spyOn(documentsExpirationModel, 'deleteOne').mockResolvedValueOnce(<DeleteResult>{ deletedCount })

            await documentsExpirationService.removeUserExpirationsByMobileUid(mobileUid, userIdentifier)

            expect(documentsExpirationModel.deleteOne).toHaveBeenCalledWith({ mobileUid, userIdentifier })
            checkExpectations()
        })
    })

    describe('method getPassportId', () => {
        it('should successfully get passport id for internal passport', async () => {
            const { docNumber: unzr, id } = testKit.docs.getInternalPassport()
            const documentsExpiration = new documentsExpirationModel({
                [DocumentType.InternalPassport]: {
                    date: now,
                    statuses: { [id]: { ownerType: OwnerType.owner, value: DocStatus.Ok } },
                },
            })

            jest.spyOn(documentsExpirationModel, 'findOne').mockResolvedValueOnce(documentsExpiration)
            jest.spyOn(passportDataMapperMock, 'extractUnzr').mockReturnValueOnce(unzr)

            const result = await documentsExpirationService.getPassportId(mobileUid, userIdentifier)

            expect(result).toEqual({
                id,
                type: PassportType.ID,
                unzr,
            })

            expect(documentsExpirationModel.findOne).toHaveBeenCalledWith({ mobileUid, userIdentifier })
            expect(passportDataMapperMock.extractUnzr).toHaveBeenCalledWith(id)
        })

        it('should successfully get passport id for foreign passport', async () => {
            const { docNumber: unzr, id } = testKit.docs.getForeignPassport()
            const documentsExpiration = new documentsExpirationModel({
                [DocumentType.InternalPassport]: {
                    date: now,
                },
                [DocumentType.ForeignPassport]: {
                    date: now,
                    statuses: { [id]: { ownerType: OwnerType.owner, value: DocStatus.Ok } },
                },
            })

            jest.spyOn(documentsExpirationModel, 'findOne').mockResolvedValueOnce(documentsExpiration)
            jest.spyOn(passportDataMapperMock, 'extractUnzr').mockReturnValueOnce(unzr)

            const result = await documentsExpirationService.getPassportId(mobileUid, userIdentifier)

            expect(result).toEqual({
                id,
                type: PassportType.P,
                unzr,
            })

            expect(documentsExpirationModel.findOne).toHaveBeenCalledWith({ mobileUid, userIdentifier })
            expect(passportDataMapperMock.extractUnzr).toHaveBeenCalledWith(id)
        })

        it('should fail to get passport id in case none of passports statuses are present', async () => {
            const documentsExpiration = new documentsExpirationModel({
                [DocumentType.InternalPassport]: {
                    date: now,
                },
                [DocumentType.ForeignPassport]: {
                    date: now,
                },
            })

            jest.spyOn(documentsExpirationModel, 'findOne').mockResolvedValueOnce(documentsExpiration)

            await expect(async () => {
                await documentsExpirationService.getPassportId(mobileUid, userIdentifier)
            }).rejects.toEqual(new NotFoundError('Passports not found'))

            expect(documentsExpirationModel.findOne).toHaveBeenCalledWith({ mobileUid, userIdentifier })
            expect(loggerMock.error).toHaveBeenCalledWith("Couldn't find passports in expirations", { userIdentifier, mobileUid })
        })

        it('should fail to get passport id in case documents expiration not found', async () => {
            jest.spyOn(documentsExpirationModel, 'findOne').mockResolvedValueOnce(null)

            await expect(async () => {
                await documentsExpirationService.getPassportId(mobileUid, userIdentifier)
            }).rejects.toEqual(new NotFoundError('DocumentsExpiration not found'))

            expect(documentsExpirationModel.findOne).toHaveBeenCalledWith({ mobileUid, userIdentifier })
        })
    })

    describe('method expireDocumentByType', () => {
        it('should successfully expire document by type', async () => {
            const documentType = <DocumentType>'document-type'
            const expirationDate: Date = new Date()
            const expirationsModifier = {
                $set: { [`${documentType}.date`]: expirationDate },
            }

            jest.spyOn(documentsExpirationModel, 'updateMany').mockResolvedValueOnce(<UpdateWriteOpResult>{ modifiedCount: 1 })

            await documentsExpirationService.expireDocumentByType(documentType, userIdentifier)

            expect(documentsExpirationModel.updateMany).toHaveBeenCalledWith({ userIdentifier }, expirationsModifier, { upsert: true })
        })
    })

    describe('method checkDocumentExpiration', () => {
        it('should skip checking in case documents expiration is disabled in configuration', () => {
            const documentType = <DocumentType>'document-to-not-skip'
            const documentsExpirationServiceWithDisabledExpiration = new DocumentsExpirationService(
                new PluginDepsCollectionMock([getDocumentExpirationService()]),
                documentSettingsServiceMock,
                passportDataMapperMock,
                <AppConfig>{ app: { isDocumentsExpirationEnabled: false } },
                loggerMock,
            )

            expect(documentsExpirationServiceWithDisabledExpiration.checkDocumentExpiration(documentType, { date: now })).toBeUndefined()
        })

        it('should successfully check and return not expired', () => {
            const documentType = <DocumentType>'document-to-not-skip'
            const expirationDate = new Date(now.getTime() + 30000)

            const result = documentsExpirationService.checkDocumentExpiration(documentType, { date: expirationDate })

            expect(result).toEqual({
                currentDate: now.toISOString(),
                expirationDate: expirationDate.toISOString(),
            })
        })
    })

    describe('method getExpirationForBlockedDocumentByAppVersion', () => {
        it('should return expiration for blocked document by app version', () => {
            const expectedResult = {
                currentDate: now.toISOString(),
                expirationDate: new Date(now.getTime() + 10 * DurationMs.Hour).toISOString(),
            }

            const result = documentsExpirationService.getExpirationForBlockedDocumentByAppVersion()

            expect(result).toEqual(expectedResult)
        })
    })

    describe('method generateMetaData', () => {
        it('should return generated meta data', () => {
            const expectedResult = {
                currentDate: now.toISOString(),
                expirationDate: new Date(now.getTime() + 30000 * 1000).toISOString(),
            }

            const result = documentsExpirationService.generateMetaData()

            expect(result).toEqual(expectedResult)
        })
    })
})
