import { ObjectId } from 'bson'
import { AnyBulkWriteOperation } from 'mongodb'
import { AnyObject, Document, FilterQuery, Model } from 'mongoose'

import { DatabaseError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'

export default class ArchiveService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
    ) {}

    async archiveDocuments<SourceModel extends AnyObject, ArchiveModel extends AnyObject>(
        sourceModel: Model<SourceModel>,
        archiveModel: Model<ArchiveModel>,
        query: FilterQuery<SourceModel>,
    ): Promise<void> {
        const { name: colName } = sourceModel.collection

        const totalDocsToArchive: number = await sourceModel.countDocuments(query)

        this.logger.info(`${colName}: Found [${totalDocsToArchive}] documents to archive`, { query })
        if (!totalDocsToArchive) {
            return this.logger.debug(`${colName}: Documents to archive are absent`)
        }

        const { docsPerIteration } = this.config.archive
        const iterations: number = totalDocsToArchive > docsPerIteration ? Math.ceil(totalDocsToArchive / docsPerIteration) : 1

        for (let i = 0; i < iterations; i++) {
            const docs: Document[] = await sourceModel.find(query).limit(docsPerIteration)
            if (!docs.length) {
                this.logger.debug(`${colName}: No more docs to archive`)
                break
            }

            if (!(await this.moveToArchive(archiveModel, docs))) {
                throw new DatabaseError(`${colName}: Failed to archive docs [${docs.length}]`)
            }

            const docIds: ObjectId[] = docs.map((doc: Document): ObjectId => doc._id)
            const deleteQuery: FilterQuery<SourceModel> = <FilterQuery<SourceModel>>{ _id: docIds }
            const { deletedCount } = await sourceModel.deleteMany(deleteQuery)
            if (deletedCount !== docs.length) {
                throw new DatabaseError(`${colName}: Failed to delete docs [${docs.length}], deleted [${deletedCount}]`)
            }
        }

        this.logger.info(`${colName}: Successfully archived docs [${totalDocsToArchive}]`)
    }

    private async moveToArchive<ArchiveModel>(archiveModel: Model<ArchiveModel>, docs: Document[]): Promise<boolean> {
        const { name: colName } = archiveModel.collection

        try {
            const operations: AnyBulkWriteOperation<AnyObject>[] = docs.map(
                (doc: Document<AnyObject>): AnyBulkWriteOperation<AnyObject> => ({
                    replaceOne: {
                        filter: { _id: doc._id },
                        replacement: doc,
                        upsert: true,
                    },
                }),
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await archiveModel.bulkWrite(<any>operations)
            const { upsertedCount, matchedCount } = result
            if (upsertedCount + matchedCount !== docs.length) {
                this.logger.error(
                    `${colName}: Failed to archive docs. Total [${docs.length}], processed [${upsertedCount}, ${matchedCount}]`,
                )

                return false
            }
        } catch (err) {
            this.logger.error(`${colName}: Failed to insert docs to the archive collection`, { err })

            return false
        }

        return true
    }
}
