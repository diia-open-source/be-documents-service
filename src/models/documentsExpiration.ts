import { Model, Schema, SchemaDefinition, model, models } from 'mongoose'

import { DocumentType } from '@diia-inhouse/types'

import { DocumentIdsExpiration, DocumentsExpiration } from '@interfaces/models/documentsExpiration'

const documentIdsExpirationSchema = new Schema<DocumentIdsExpiration>(
    {
        date: { type: Date, required: true },
        statuses: { type: Object },
        eTag: { type: String },
    },
    { _id: false },
)

export const documentsExpirationSchema = new Schema<DocumentsExpiration>(
    Object.values(DocumentType).reduce<SchemaDefinition<DocumentsExpiration>>(
        (acc, type) => {
            acc[type] = { type: documentIdsExpirationSchema }

            return acc
        },
        {
            mobileUid: { type: String, required: true },
            userIdentifier: { type: String, index: true, required: true },
        },
    ),
    { timestamps: true },
)

documentsExpirationSchema.index(
    { mobileUid: 1, userIdentifier: 1 },
    { unique: true, partialFilterExpression: { userIdentifier: { $exists: true } } },
)

export default <Model<DocumentsExpiration>>models.DocumentsExpiration || model('DocumentsExpiration', documentsExpirationSchema)
