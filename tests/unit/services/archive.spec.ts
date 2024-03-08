import { FilterQuery, Model } from 'mongoose'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { DatabaseError, NotFoundError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode } from '@diia-inhouse/types'

import ArchiveService from '@services/archive'

import { AppConfig } from '@interfaces/config'
import { DocumentSetting, DocumentSettingModel, DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'

describe('archiveService', () => {
    const configMock = <AppConfig>(<unknown>{
        archive: {
            docsPerIteration: 10,
        },
    })
    const loggerMock = mockInstance(DiiaLogger)

    const archiveService = new ArchiveService(configMock, loggerMock)
    let id = 1

    const generateDocumentSetting = (): DocumentSetting =>
        <DocumentSetting>{
            _id: id++,
            type: <DocumentType>'document-type',
            version: DocumentSettingVersion.V1,
            expirationTime: {
                [ExpirationType.Success]: HttpStatusCode.OK,
                [ExpirationType.PartialUnavailable]: HttpStatusCode.FORBIDDEN,
                [ExpirationType.RegistryError]: HttpStatusCode.INTERNAL_SERVER_ERROR,
            },
        }

    describe('method: `archiveDocuments`', () => {
        it('should call logger.debug', async () => {
            const sourceModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: [],
                countDocuments: jest.fn(),
            })
            const archiveModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: [],
            })

            const query = <FilterQuery<DocumentSettingModel>>(<unknown>{})

            await archiveService.archiveDocuments(sourceModel, archiveModel, query)

            expect(loggerMock.debug).toHaveBeenCalled()
        })

        it('should call logger.info when returned documents is empty', async () => {
            const sourceModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: [],
                countDocuments: jest.fn().mockResolvedValueOnce(5),
                find: jest.fn().mockReturnValueOnce({
                    limit: jest.fn().mockReturnValueOnce([]),
                }),
            })
            const archiveModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'DocumentSettingModel',
                },
            })

            const query = <FilterQuery<DocumentSettingModel>>(<unknown>{})

            await archiveService.archiveDocuments(sourceModel, archiveModel, query)

            expect(loggerMock.info).toHaveBeenCalled()
        })

        it('should throw DatabaseError when storing to archiveModels is failed', async () => {
            const docs = [generateDocumentSetting(), generateDocumentSetting()]
            const sourceModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'sourceModel',
                },
                countDocuments: jest.fn().mockResolvedValueOnce(docs.length),
                find: jest.fn().mockReturnValueOnce({
                    limit: jest.fn().mockReturnValueOnce(docs),
                }),
            })
            const archiveModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'archiveModel',
                },
                bulkWrite: jest.fn().mockRejectedValueOnce(NotFoundError),
            })

            const query = <FilterQuery<DocumentSettingModel>>(<unknown>{})

            await expect(archiveService.archiveDocuments(sourceModel, archiveModel, query)).rejects.toBeInstanceOf(DatabaseError)
        })

        it('should throw DatabaseError when inserted or updated less docs then exist in the collection', async () => {
            const docs = [generateDocumentSetting(), generateDocumentSetting()]
            const sourceModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'sourceModel',
                },
                countDocuments: jest.fn().mockResolvedValueOnce(docs.length),
                find: jest.fn().mockReturnValueOnce({
                    limit: jest.fn().mockReturnValueOnce(docs),
                }),
            })
            const archiveModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'archiveModel',
                },
                bulkWrite: jest.fn().mockResolvedValueOnce({
                    upsertedCount: 0,
                    matchedCount: 0,
                }),
            })

            const query = <FilterQuery<DocumentSettingModel>>(<unknown>{})

            await expect(archiveService.archiveDocuments(sourceModel, archiveModel, query)).rejects.toBeInstanceOf(DatabaseError)
        })

        it('should throw DatabaseError when count of deleted documents is less then exist in collection by query', async () => {
            const docs = [generateDocumentSetting(), generateDocumentSetting()]
            const sourceModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'sourceModel',
                },
                countDocuments: jest.fn().mockResolvedValueOnce(docs.length),
                find: jest.fn().mockReturnValueOnce({
                    limit: jest.fn().mockReturnValueOnce(docs),
                }),
                deleteMany: jest.fn().mockResolvedValueOnce(0),
            })
            const archiveModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'archiveModel',
                },
                bulkWrite: jest.fn().mockResolvedValueOnce({
                    upsertedCount: docs.length,
                    matchedCount: 0,
                }),
            })

            const query = <FilterQuery<DocumentSettingModel>>(<unknown>{})

            await expect(archiveService.archiveDocuments(sourceModel, archiveModel, query)).rejects.toBeInstanceOf(DatabaseError)
        })

        it('should resolves successfully when updated and deleted documents correct count', async () => {
            const docs = [generateDocumentSetting(), generateDocumentSetting()]
            const sourceModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'sourceModel',
                },
                countDocuments: jest.fn().mockResolvedValueOnce(docs.length),
                find: jest.fn().mockReturnValueOnce({
                    limit: jest.fn().mockReturnValueOnce(docs),
                }),
                deleteMany: jest.fn().mockResolvedValueOnce({
                    deletedCount: docs.length,
                }),
            })
            const archiveModel = <Model<DocumentSettingModel>>(<unknown>{
                collection: {
                    name: 'archiveModel',
                },
                bulkWrite: jest.fn().mockResolvedValueOnce({
                    upsertedCount: docs.length,
                    matchedCount: 0,
                }),
            })

            const query = <FilterQuery<DocumentSettingModel>>(<unknown>{})

            await expect(archiveService.archiveDocuments(sourceModel, archiveModel, query)).resolves.toBeUndefined()
        })
    })
})
