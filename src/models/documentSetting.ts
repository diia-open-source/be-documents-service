import { Model, Schema, SchemaDefinition, model, models } from '@diia-inhouse/db'

import { documentTypes } from '@src/documents/deps'

import { DocumentSetting, DocumentSettingVersion, ExpirationTime, ExpirationType } from '@interfaces/models/documentSetting'

const expirationSchemaDefinition = ((): SchemaDefinition<ExpirationTime> => {
    const acc: SchemaDefinition<ExpirationTime> = {}
    for (const type of Object.values(ExpirationType)) {
        acc[type] = { type: Number, required: true }
    }

    return acc
})()

const expirationSchema = new Schema<ExpirationTime>(expirationSchemaDefinition, { _id: false })

const documentSettingSchema = new Schema<DocumentSetting>(
    {
        type: { type: String, enum: documentTypes, required: true },
        version: { type: Number, enum: Object.values(DocumentSettingVersion).filter(Number.isInteger), required: true },
        expirationTime: { type: expirationSchema, required: true },
        defaultHidden: { type: Boolean },
    },
    {
        timestamps: true,
    },
)

documentSettingSchema.index({ type: 1, version: 1 }, { unique: true })

export default <Model<DocumentSetting>>models.DocumentSetting || model('DocumentSetting', documentSettingSchema)
