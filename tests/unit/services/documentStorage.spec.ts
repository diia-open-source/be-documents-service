import { CryptoService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import DocumentStorageService from '@services/documentStorage'
import UserService from '@services/user'

describe(`Service ${DocumentStorageService.name}`, () => {
    const testKit = new TestKit()
    const userService = mockInstance(UserService)
    const crypto = mockInstance(CryptoService)

    const service = new DocumentStorageService(userService, crypto)
    const { user } = testKit.session.getUserSession()

    describe(`method: ${service.encryptDataAndSaveInStorage.name}`, () => {
        it('should successfully encrypt data and save in storage', async () => {
            const data = { hashData: 'hash', encryptedData: 'encryptedData' }
            const dataToEncrypt = { id: 'id' }

            jest.spyOn(crypto, 'encryptData').mockResolvedValueOnce(data)
            jest.spyOn(userService, 'addDocumentInStorage').mockResolvedValueOnce()

            expect(await service.encryptDataAndSaveInStorage(user.identifier, DocumentType.InternalPassport, dataToEncrypt)).toBeUndefined()
            expect(crypto.encryptData).toHaveBeenCalledWith(dataToEncrypt)
            expect(userService.addDocumentInStorage).toHaveBeenCalledWith(
                user.identifier,
                DocumentType.InternalPassport,
                data.hashData,
                data.encryptedData,
                undefined,
            )
        })
    })

    describe(`method: ${service.removeFromStorage.name}`, () => {
        it('should successfully remove document from storage', async () => {
            const dataToEncrypt = { id: 'id' }
            const hashData = 'hash'

            jest.spyOn(crypto, 'generateHashData').mockReturnValueOnce(hashData)
            jest.spyOn(userService, 'removeFromStorageByHashData').mockResolvedValueOnce()

            expect(await service.removeFromStorage(user.identifier, DocumentType.InternalPassport, dataToEncrypt)).toBeUndefined()

            expect(crypto.generateHashData).toHaveBeenCalledWith(dataToEncrypt)
            expect(userService.removeFromStorageByHashData).toHaveBeenCalledWith(user.identifier, DocumentType.InternalPassport, hashData)
        })
    })
})
