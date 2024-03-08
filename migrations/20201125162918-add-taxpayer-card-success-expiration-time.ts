import 'module-alias/register'

import { Db, Filter } from 'mongodb'
import { UpdateQuery } from 'mongoose'

import { DocumentType } from '@diia-inhouse/types'

import { DocumentSetting, ExpirationType } from '@interfaces/models/documentSetting'

const collectionName = 'documentsettings'

export async function up(db: Db): Promise<void> {
    const oneHourInSec: number = 60 * 60
    const oneDayInSec: number = 24 * oneHourInSec

    const query: Filter<DocumentSetting> = { type: DocumentType.TaxpayerCard }
    const modifier: UpdateQuery<DocumentSetting> = {
        $set: { [`expirationTime.${ExpirationType.Success}`]: oneDayInSec },
    }

    await db.collection<DocumentSetting>(collectionName).updateOne(query, modifier)
}

export async function down(db: Db): Promise<void> {
    const query: Filter<DocumentSetting> = { type: DocumentType.TaxpayerCard }
    const modifier: UpdateQuery<DocumentSetting> = {
        $unset: { [`expirationTime.${ExpirationType.Success}`]: 1 },
    }

    await db.collection<DocumentSetting>(collectionName).updateOne(query, modifier)
}
