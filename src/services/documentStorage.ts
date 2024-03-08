import { CryptoService, DocumentDecryptedData } from '@diia-inhouse/crypto'
import { DocumentType } from '@diia-inhouse/types'

import UserService from '@services/user'

export default class DocumentStorageService {
    constructor(
        private readonly userService: UserService,

        private readonly crypto: CryptoService,
    ) {}

    async encryptDataAndSaveInStorage(
        userIdentifier: string,
        documentType: DocumentType,
        dataToEncrypt: DocumentDecryptedData,
        mobileUid?: string,
    ): Promise<void> {
        const { hashData, encryptedData } = await this.crypto.encryptData(dataToEncrypt)

        await this.userService.addDocumentInStorage(userIdentifier, documentType, hashData, encryptedData, mobileUid)
    }

    async removeFromStorage(identifier: string, documentType: DocumentType, dataToEncrypt: DocumentDecryptedData): Promise<void> {
        const hashData = this.crypto.generateHashData(dataToEncrypt)

        return await this.userService.removeFromStorageByHashData(identifier, documentType, hashData)
    }
}
