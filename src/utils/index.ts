import moment from 'moment'

import { IdentifierService } from '@diia-inhouse/crypto'
import { BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import { AppUser, AuthDocumentType, DocumentType, Logger, OwnerType, PortalUserTokenData } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import { Person, Representative } from '@interfaces/providers/eis'
import { AvailableDocumentDecryptedData, DocumentDecryptedDataByDocumentType } from '@interfaces/services/cryptData'
import { CommonDocument } from '@interfaces/services/documents'
import { ConvertDateOps } from '@interfaces/utils'

export default class Utils {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly identifier: IdentifierService,
    ) {}

    convertDate(date: string, ops: ConvertDateOps = {}): string | undefined {
        if (!date) {
            return
        }

        const { fromFormat = '', toFormat = this.config.app.dateFormat, locale = this.config.app.dateLocale } = ops

        if (!moment(date, fromFormat, true).isValid()) {
            return
        }

        return moment(date, fromFormat).locale(locale).format(toFormat)
    }

    convertToDate(appDateString: string | undefined, fromFormat = this.config.app.dateFormat): Date | undefined {
        return moment(appDateString, fromFormat).isValid() ? moment(appDateString, fromFormat).toDate() : undefined
    }

    convertIsoToDate(isoString: string): Date | undefined {
        return moment(isoString).isValid() ? moment(isoString).toDate() : undefined
    }

    throwInternalExceptionOnError(err: Error): never {
        this.logger.error('Internal error occured: ', err)

        throw new InternalServerError()
    }

    generateRandomNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    collectRepresentative(user: AppUser | PortalUserTokenData): Representative {
        const { itn, fName, mName, lName } = user
        const representative: Representative = { rnokpp: itn, firstname: fName, middlename: mName?.trim(), lastname: lName }

        if ('document' in user) {
            const document = this.getValidPassport(user)
            if (document) {
                representative.document = document
            }
        }

        return representative
    }

    collectPerson(user: AppUser): Person {
        const { itn } = user
        const person: Person = { rnokpp: itn }
        const document = this.getValidPassport(user)
        if (document) {
            person.document = document
        }

        return person
    }

    getValidPassport(user: AppUser): string | undefined {
        const { document, passport } = user
        let validPassport: string | undefined

        if (document) {
            if ([AuthDocumentType.IdCard, AuthDocumentType.PaperInternalPassport].includes(<AuthDocumentType>document?.type)) {
                validPassport = document.value
            }
        } else if (passport) {
            // backward compatibility for old tokens
            if (/^\d{9}$/.test(passport) || /^[а-я]{2}\d{6}$/i.test(passport)) {
                validPassport = passport
            }
        }

        return validPassport
    }

    isFutureDate(date: string): boolean {
        const compareDate: moment.Moment = moment(date).startOf('day')
        if (!compareDate.isValid()) {
            return false
        }

        const today: moment.Moment = moment().startOf('day')

        return compareDate.valueOf() > today.valueOf()
    }

    isExpiredDate(date: string): boolean {
        const compareDate: moment.Moment = moment(date).startOf('day')
        if (!compareDate.isValid()) {
            return false
        }

        const today: moment.Moment = moment().startOf('day')

        return compareDate.valueOf() < today.valueOf()
    }

    isValidDate(input: string): boolean {
        const date: moment.Moment = moment(input)

        return date.isValid()
    }

    getAge(birthDay: string, format = 'DD.MM.YYYY'): number {
        const birthdayDate: moment.Moment = moment(birthDay, format)
        if (!birthdayDate.isValid()) {
            throw new Error('Invalid user birthday')
        }

        const age: number = moment().diff(birthdayDate, 'years')

        return age
    }

    assertObjectHasOnlyOneOf<T extends object>(object: T, ...keys: (keyof T)[]): void | never {
        if (keys.filter((key) => key in object).length > 1) {
            throw new BadRequestError(`Expected to have only one of [${keys.join(', ')}]`)
        }

        if (!keys.some((key) => key in object)) {
            throw new BadRequestError(`Expected to have one of [${keys.join(', ')}]`)
        }
    }

    createFullNameHash(lastName: string, firstName: string, middleName?: string): string {
        const preparedFullName = `${lastName}${firstName}${middleName}`.toLowerCase().replace(/[^а-щьюяґєії]/g, '')

        return this.identifier.createIdentifier(preparedFullName)
    }

    getStorageDataByDocumentTypes<T extends AvailableDocumentDecryptedData>(
        documentType: DocumentType | undefined,
        storageDataByDocumentTypes: DocumentDecryptedDataByDocumentType | undefined,
    ): T[] {
        if (!documentType || !storageDataByDocumentTypes) {
            return []
        }

        if (this.assertIsAvailableDocumentTypeToEncrypt(documentType, storageDataByDocumentTypes)) {
            const result = <T[]>(storageDataByDocumentTypes[documentType] || [])

            return result
        }

        return []
    }

    getFullNameWithSeparatedMiddleName(lastName: string, firstName: string, middleName?: string, separator = ' '): string {
        return `${lastName} ${firstName}${separator}${middleName || ''}`.trim()
    }

    getDocumentPhoto(document: CommonDocument): string | undefined {
        if ('photo' in document) {
            return <string>document.photo
        }
    }

    getDocumentSubType(document: CommonDocument): string | undefined {
        if ('subtype' in document) {
            return document.subtype
        }
    }

    getDocumentOwnerType(document: CommonDocument): OwnerType {
        return document.ownerType || OwnerType.owner
    }

    getDocumentExpirationDate(document: CommonDocument): Date | undefined {
        const { expirationDate } = document

        if (expirationDate instanceof Date) {
            return expirationDate
        }

        const dateObject = moment(expirationDate, this.config.app.dateFormat)

        return dateObject.isValid() ? dateObject.toDate() : undefined
    }

    getDocumentIssueDate(document: CommonDocument): Date | undefined {
        if ('issueDate' in document) {
            const { issueDate } = document

            if (issueDate instanceof Date) {
                return issueDate
            }

            const dateObject = moment(issueDate, this.config.app.dateFormat)

            return dateObject.isValid() ? dateObject.toDate() : undefined
        }
    }

    private assertIsAvailableDocumentTypeToEncrypt(
        documentType: DocumentType,
        storageDataByDocumentTypes: DocumentDecryptedDataByDocumentType,
    ): boolean {
        return documentType in storageDataByDocumentTypes
    }
}
