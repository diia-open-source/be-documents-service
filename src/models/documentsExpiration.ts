import { Model, Schema, SchemaDefinition, model, models } from '@diia-inhouse/db'

import { documentTypes } from '@src/documents/deps'

import { DocumentIdsExpiration, DocumentsExpiration } from '@interfaces/models/documentsExpiration'

const documentIdsExpirationSchema = new Schema<DocumentIdsExpiration>(
    {
        date: { type: Date, required: true },
        statuses: { type: Object },
        eTag: { type: String },
    },
    { _id: false },
)

export const documentsExpirationSchema = ((): Schema<DocumentsExpiration> => {
    const schemaDefinition: SchemaDefinition<DocumentsExpiration> = {
        mobileUid: { type: String, required: true },
        userIdentifier: { type: String, index: true, required: true },
    }

    for (const type of documentTypes) {
        schemaDefinition[type] = { type: documentIdsExpirationSchema }
    }

    return new Schema<DocumentsExpiration>(schemaDefinition, { timestamps: true })
})()

documentsExpirationSchema.index(
    { mobileUid: 1, userIdentifier: 1 },
    { unique: true, partialFilterExpression: { userIdentifier: { $exists: true } } },
)

export default <Model<DocumentsExpiration>>models.DocumentsExpiration || model('DocumentsExpiration', documentsExpirationSchema)
