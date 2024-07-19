import 'module-alias/register'

import { mongo } from '@diia-inhouse/db'

import { DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'

const collectionName = 'documentsettings'

export async function up(db: mongo.Db): Promise<void> {
    const oneHourInSec: number = 60 * 60
    const oneDayInSec: number = 24 * oneHourInSec

    const settings: Record<string, unknown>[] = [
        {
            type: 'driver-license',
            expirationTime: {
                [ExpirationType.Success]: oneDayInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
            version: DocumentSettingVersion.V1,
        },
        {
            type: 'internal-passport',
            expirationTime: {
                [ExpirationType.Success]: oneDayInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
            version: DocumentSettingVersion.V1,
        },
        {
            type: 'driver-license',
            expirationTime: {
                [ExpirationType.Success]: oneDayInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
            version: DocumentSettingVersion.V2,
        },
        {
            type: 'internal-passport',
            expirationTime: {
                [ExpirationType.Success]: oneDayInSec,
                [ExpirationType.RegistryError]: oneHourInSec,
            },
            version: DocumentSettingVersion.V2,
        },
    ]

    await db.collection(collectionName).insertMany(settings)
}

export async function down(db: mongo.Db): Promise<void> {
    await db.dropCollection(collectionName)
}
