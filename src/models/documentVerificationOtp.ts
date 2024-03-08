import { Model, Schema, model, models } from 'mongoose'

import { DocStatus, DocumentType, Localization, OwnerType } from '@diia-inhouse/types'

import { DocumentVerificationOtp } from '@interfaces/models/documentVerificationOtp'

export const documentVerificationOtpSchema = new Schema<DocumentVerificationOtp>(
    {
        userIdentifier: { type: String, index: true, required: true },
        documentId: { type: String, required: true },
        requestorJWE: { type: String, required: true },
        consumerJWE: { type: String },
        registryDocumentType: { type: String, enum: Object.values(DocumentType), required: true },
        hash: { type: String, unique: true, required: true },
        expirationDate: { type: Date, required: true },
        ownerType: { type: String, enum: Object.values(OwnerType), required: true },
        docStatus: { type: Number, enum: Object.values(DocStatus).filter(Number.isInteger), required: true },
        usedDate: { type: Date },
        barcode: { type: String, unique: true, sparse: true },
        localization: { type: String, enum: Object.values(Localization) },
    },
    {
        timestamps: true,
    },
)

export default <Model<DocumentVerificationOtp>>models.DocumentVerificationOtp ||
    model('DocumentVerificationOtp', documentVerificationOtpSchema)
