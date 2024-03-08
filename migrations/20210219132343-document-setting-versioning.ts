// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'

import { AnyBulkWriteOperation, Db } from 'mongodb'

import { DocumentType } from '@diia-inhouse/types'

import { DocumentSetting, DocumentSettingVersion, ExpirationTime, ExpirationType } from '@interfaces/models/documentSetting'

const collectionName = 'documentsettings'

const oneHourInSec: number = 60 * 60
const oneDayInSec: number = 24 * oneHourInSec

const expirationTimeByDocumentType: Record<string, ExpirationTime> = {
    [DocumentType.DriverLicense]: {
        [ExpirationType.Success]: oneHourInSec,
        [ExpirationType.RegistryError]: oneHourInSec,
    },
    [DocumentType.InternalPassport]: {
        [ExpirationType.Success]: oneDayInSec,
        [ExpirationType.RegistryError]: oneHourInSec,
    },
    [DocumentType.ForeignPassport]: {
        [ExpirationType.Success]: oneDayInSec,
        [ExpirationType.RegistryError]: oneHourInSec,
    },
    [DocumentType.TaxpayerCard]: {
        [ExpirationType.Success]: oneDayInSec,
        [ExpirationType.RegistryError]: oneHourInSec,
    },
}

const documentTypesToIncreaseVersion: string[] = [
    DocumentType.DriverLicense,
    DocumentType.InternalPassport,
    DocumentType.ForeignPassport,
    DocumentType.TaxpayerCard,
]

export async function up(db: Db): Promise<void> {
    await db.collection(collectionName).dropIndexes()
    await db.collection(collectionName).updateMany({}, { $set: { version: DocumentSettingVersion.V1 } })

    const operations: AnyBulkWriteOperation<DocumentSetting>[] = documentTypesToIncreaseVersion.map((type: DocumentType) => ({
        insertOne: {
            document: {
                type,
                version: DocumentSettingVersion.V2,
                expirationTime: expirationTimeByDocumentType[type],
            },
        },
    }))

    await db.collection<DocumentSetting>(collectionName).bulkWrite(operations)
}
