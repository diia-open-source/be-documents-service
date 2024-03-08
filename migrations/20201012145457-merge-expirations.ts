// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'

import { AnyBulkWriteOperation, Db, Document, ObjectId } from 'mongodb'

import { DocumentType } from '@diia-inhouse/types'

import { DocumentsExpiration, DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'

const collectionName = 'documentsexpirations'

interface AggregationResult {
    _id: string
    docs: DocumentsExpiration[]
}

export async function up(db: Db): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const pipeline: Document[] = [{ $group: { _id: '$mobileUid', docs: { $push: '$$ROOT' } } }, { $match: { 'docs.1': { $exists: true } } }]

    const result: Document[] = await db
        .collection<DocumentsExpiration>(collectionName)
        .aggregate(pipeline, { allowDiskUse: true })
        .toArray()

    const operations: AnyBulkWriteOperation<DocumentsExpiration>[] = []

    result.forEach(({ _id: mobileUid, docs }: AggregationResult) => {
        const docToInsert: DocumentsExpiration = <DocumentsExpiration>{
            mobileUid,
            userIdentifier: docs[0].userIdentifier,
            createdAt: new Date(),
        }
        const idsToRemove: ObjectId[] = []

        docs.forEach((doc: DocumentsExpirationModel) => {
            Object.values(DocumentType).forEach((type: DocumentType) => {
                if (!doc[type]) {
                    return
                }

                if (!docToInsert[type] || doc[type].date.getTime() > docToInsert[type].date.getTime()) {
                    docToInsert[type] = doc[type]
                }
            })

            idsToRemove.push(doc._id)
        })

        operations.push({ deleteMany: { filter: { _id: { $in: idsToRemove } } } })
        operations.push({ insertOne: { document: docToInsert } })
    })

    if (operations.length) {
        await db.collection<DocumentsExpiration>(collectionName).bulkWrite(operations)
    }
}
