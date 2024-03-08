import { Model, Schema, SchemaDefinition, model, models } from 'mongoose'

import { DocumentType } from '@diia-inhouse/types'

import { DocumentSetting, DocumentSettingVersion, ExpirationTime, ExpirationType } from '@interfaces/models/documentSetting'

const expirationSchemaDefinition = Object.values(ExpirationType).reduce((acc: SchemaDefinition<ExpirationTime>, type: ExpirationType) => {
    acc[type] = { type: Number, required: true }

    return acc
}, {})

const expirationSchema = new Schema<ExpirationTime>(expirationSchemaDefinition, { _id: false })

const documentSettingSchema = new Schema<DocumentSetting>(
    {
        type: { type: String, enum: Object.values(DocumentType), required: true },
        version: { type: Number, enum: Object.values(DocumentSettingVersion).filter(Number.isInteger), required: true },
        expirationTime: { type: expirationSchema, required: true },
    },
    {
        timestamps: true,
    },
)

documentSettingSchema.index({ type: 1, version: 1 }, { unique: true })

export default <Model<DocumentSetting>>models.DocumentSetting || model('DocumentSetting', documentSettingSchema)
