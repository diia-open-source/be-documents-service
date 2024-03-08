import 'module-alias/register'

import { Db } from 'mongodb'

import { DocumentType } from '@diia-inhouse/types'

import { ExpirationType } from '@interfaces/models/documentSetting'

const collectionName = 'documentsettings'

export async function up(db: Db): Promise<void> {
    const oneHourInSec: number = 60 * 60
    const oneDayInSec: number = 24 * oneHourInSec

    const settings: Record<string, unknown>[] = [
        {
            type: DocumentType.DriverLicense,
            expirationTime: {
                [ExpirationType.Success]: oneHourInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
        },
        {
            type: DocumentType.InternalPassport,
            expirationTime: {
                [ExpirationType.Success]: oneDayInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
        },
        {
            type: DocumentType.ForeignPassport,
            expirationTime: {
                [ExpirationType.Success]: oneDayInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
        },
        {
            type: DocumentType.TaxpayerCard,
            expirationTime: {
                [ExpirationType.RegistryError]: oneHourInSec,
            },
        },
    ]

    await db.collection(collectionName).insertMany(settings)
}

export async function down(db: Db): Promise<void> {
    await db.dropCollection(collectionName)
}
