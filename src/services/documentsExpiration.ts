import { isEmpty } from 'lodash'
import { UpdateQuery } from 'mongoose'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { NotFoundError } from '@diia-inhouse/errors'
import { DocumentType, DurationMs, Logger } from '@diia-inhouse/types'

import DocumentSettingsService from '@services/documentSettings'

import documentsExpirationModel from '@models/documentsExpiration'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import { AppConfig } from '@interfaces/config'
import { PassportType } from '@interfaces/dto'
import { DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'
import { DocumentIdsExpiration, DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'
import { Writeable } from '@interfaces/services'
import { DocumentExpirationService } from '@interfaces/services/documents'
import { DocumentExpirationModifier, DocumentIdStatus, PassportId } from '@interfaces/services/documentsExpiration'
import { DocumentsMetaData } from '@interfaces/services/documentsMetaData'

export default class DocumentsExpirationService {
    private readonly documentsToSkipExpiration = Object.values(DocumentType)

    private readonly defaultDocumentsExpirationTime = this.config.app.defaultDocumentExpirationTime

    private readonly documentsWithoutExpirationPerUser: DocumentType[] = [
        DocumentType.LocalVaccinationCertificate,
        DocumentType.ChildLocalVaccinationCertificate,
        DocumentType.InternationalVaccinationCertificate,
    ]

    private readonly blockedDocumentByAppVersionExpirationTime = 10 * DurationMs.Hour

    constructor(
        private readonly documentExpirationServices: PluginDepsCollection<DocumentExpirationService>,
        private readonly documentSettingsService: DocumentSettingsService,
        private readonly passportDataMapper: PassportDataMapper,

        private readonly config: AppConfig,
        private readonly logger: Logger,
    ) {
        this.loadPluginDeps(this.documentExpirationServices.items)
        this.documentExpirationServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    async getDocumentsExpiration(mobileUid: string, userIdentifier: string): Promise<DocumentsExpirationModel | null> {
        return await documentsExpirationModel.findOne({ mobileUid, userIdentifier })
    }

    async getDocumentIdsExpiration(
        mobileUid: string,
        userIdentifier: string,
        documentType: DocumentType,
    ): Promise<DocumentIdsExpiration | undefined> {
        const [documentExpiration] = await documentsExpirationModel
            .find({ mobileUid, userIdentifier }, { [documentType]: 1 })
            .sort({ _id: -1 })

        return documentExpiration?.[documentType]
    }

    async collectDocumentExpirationModifier(
        documentType: DocumentType,
        documentStatuses: DocumentIdStatus[],
        expirationType: ExpirationType,
        customExpirationTime?: number,
        eTag?: string,
    ): Promise<DocumentExpirationModifier> {
        const expirationTime: number =
            customExpirationTime ??
            (await this.documentSettingsService.getDocumentExpirationTime(documentType, expirationType, DocumentSettingVersion.V1))

        const expirationDate: Date = new Date(Date.now() + expirationTime * 1000)
        if (this.documentsWithoutExpirationPerUser.includes(documentType)) {
            return { expirationTime }
        }

        const modifier: Writeable<UpdateQuery<DocumentsExpirationModel>> = {
            [`${documentType}.date`]: expirationDate,
            [`${documentType}.eTag`]: eTag,
        }

        documentStatuses.forEach(({ id, status, ownerType }: DocumentIdStatus) => {
            modifier[`${documentType}.statuses.${id}`] = { value: status, ownerType }
        })

        return { expirationTime, modifier }
    }

    async performDocumentsExpirationUpdate(
        mobileUid: string,
        userIdentifier: string,
        modifier: UpdateQuery<DocumentsExpirationModel>,
    ): Promise<void> {
        this.logger.debug('Updating documents expiration time', modifier)
        if (isEmpty(modifier)) {
            return
        }

        await documentsExpirationModel.updateOne({ mobileUid, userIdentifier }, modifier, { upsert: true })
    }

    async removeUserExpirationsByMobileUid(mobileUid: string, userIdentifier: string): Promise<void> {
        const { deletedCount }: { deletedCount?: number } = await documentsExpirationModel.deleteOne({ mobileUid, userIdentifier })
        if (deletedCount) {
            this.logger.info('Successfully removed user document expiration', { mobileUid, userIdentifier })
        } else {
            this.logger.error('Failed to find user document expiration', { mobileUid, userIdentifier })
        }
    }

    async getPassportId(mobileUid: string, userIdentifier: string): Promise<PassportId> {
        const documentsExpiration = await this.getDocumentsExpiration(mobileUid, userIdentifier)

        if (!documentsExpiration) {
            throw new NotFoundError('DocumentsExpiration not found')
        }

        const internalPassportExpiration = documentsExpiration[DocumentType.InternalPassport]
        const internalPassportExpirationStatuses = internalPassportExpiration?.statuses || {}

        if (Object.keys(internalPassportExpirationStatuses).length) {
            const [id] = Object.keys(internalPassportExpirationStatuses)

            return {
                id,
                type: PassportType.ID,
                unzr: this.passportDataMapper.extractUnzr(id),
            }
        }

        const foreignPassportExpiration = documentsExpiration[DocumentType.ForeignPassport]
        const foreignPassportExpirationStatuses = foreignPassportExpiration?.statuses || {}

        if (Object.keys(foreignPassportExpirationStatuses).length) {
            const [id] = Object.keys(foreignPassportExpirationStatuses)

            return {
                id,
                type: PassportType.P,
                unzr: this.passportDataMapper.extractUnzr(id),
            }
        }

        this.logger.error("Couldn't find passports in expirations", { userIdentifier, mobileUid })

        throw new NotFoundError('Passports not found')
    }

    async expireDocumentByType(documentType: DocumentType, userIdentifier: string): Promise<void> {
        const expirationDate: Date = new Date()
        const expirationsModifier: Writeable<UpdateQuery<DocumentsExpirationModel>> = { $set: { [`${documentType}.date`]: expirationDate } }

        await documentsExpirationModel.updateMany({ userIdentifier }, expirationsModifier, { upsert: true })
    }

    checkDocumentExpiration(documentType: DocumentType, documentExpiration?: DocumentIdsExpiration): DocumentsMetaData | undefined {
        if (!documentExpiration || this.documentsToSkipExpiration.includes(documentType) || !this.config.app.isDocumentsExpirationEnabled) {
            return
        }

        if (new Date() <= documentExpiration.date) {
            return {
                currentDate: new Date().toISOString(),
                expirationDate: documentExpiration.date.toISOString(),
            }
        }
    }

    isDocumentExpired(documentExpiration: DocumentIdsExpiration | undefined, requestETag?: string): boolean {
        if (!documentExpiration) {
            return true
        }

        const { date: expireAt, eTag } = documentExpiration
        if (new Date() > expireAt) {
            return true
        }

        return !requestETag || requestETag !== eTag
    }

    getExpirationForBlockedDocumentByAppVersion(): DocumentsMetaData {
        return {
            currentDate: new Date().toISOString(),
            expirationDate: new Date(Date.now() + this.blockedDocumentByAppVersionExpirationTime).toISOString(),
        }
    }

    generateMetaData(expirationTime: number = this.defaultDocumentsExpirationTime): DocumentsMetaData {
        const currentDate: string = new Date().toISOString()
        const expirationDate: string = new Date(Date.now() + expirationTime * 1000).toISOString()

        return {
            currentDate,
            expirationDate,
        }
    }

    private loadPluginDeps(instances: DocumentExpirationService[]): void {
        instances.forEach((instance) => {
            const { documentsWithoutExpirationPerUser = [] } = instance

            this.documentsWithoutExpirationPerUser.push(...documentsWithoutExpirationPerUser)
        })
    }
}
