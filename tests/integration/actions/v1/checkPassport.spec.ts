import { MoleculerService } from '@diia-inhouse/diia-app'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator, ExternalEvent, InternalEvent, Task } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { ActionVersion, DocumentType } from '@diia-inhouse/types'

import CheckPassportAction from '@src/actions/v1/checkPassport'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { AppConfig } from '@interfaces/config'
import { Person, Representative } from '@interfaces/providers/eis'
import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/publishAdultRegistrationAddressCommunity'

describe(`Action ${CheckPassportAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: CheckPassportAction
    let moleculer: MoleculerService
    let external: ExternalCommunicator
    let eventBus: EventBus
    let task: Task
    let config: AppConfig
    let identifierService: IdentifierService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(CheckPassportAction)
        external = app.container.resolve('external')
        moleculer = app.container.resolve<MoleculerService>('moleculer')
        eventBus = app.container.resolve<EventBus>('eventBus')
        task = app.container.resolve<Task>('task')
        config = app.container.resolve('config')
        identifierService = app.container.resolve<IdentifierService>('identifier')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return true if internal passport document exists and handle photo', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()
        const passportEisSuccessResponse = getPassport()
        const {
            documents: [, idCard],
        } = passportEisSuccessResponse
        const {
            user: { itn, identifier: userIdentifier, lName, fName, mName, birthDay, gender },
        } = session
        const documentIdentifier = identifierService.createIdentifier(idCard.number)

        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(passportEisSuccessResponse)
        jest.spyOn(moleculer, 'act').mockResolvedValueOnce({
            documents: [{ documentType: DocumentType.InternalPassport, documentIdentifier: 'other-document-identifier' }],
        })

        // Act
        const result = await action.handler({ session, headers, params: { handlePhoto: true } })

        // Assert
        expect(result).toEqual({ exists: true })

        expect(external.receiveDirect).toHaveBeenCalledWith(
            ExternalEvent.RepoDocumentPassports,
            {
                addressInStructure: config.eis.addressInStructure,
                person: <Person>{ rnokpp: itn },
                representative: <Representative>{
                    firstname: fName,
                    lastname: lName,
                    middlename: mName,
                    rnokpp: itn,
                },
            },
            {},
        )
        expect(task?.publish).toHaveBeenCalledWith(ServiceTask.PublishAdultRegistrationAddressCommunity, <EventPayload>{
            userIdentifier,
            itn,
            lName,
            fName,
            mName,
            birthDay,
            gender,
            koatuu: '8000000000',
        })
        expect(moleculer.act).toHaveBeenCalledWith(
            'User',
            {
                name: 'checkDocumentsFeaturePoints',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier },
            },
        )
        expect(eventBus?.publish).toHaveBeenCalledWith(InternalEvent.DocumentsAddDocumentPhoto, {
            userIdentifier,
            documentType: DocumentType.InternalPassport,
            documentIdentifier,
            photo: idCard.photo,
        })
        expect(eventBus?.publish).toHaveBeenCalledWith(InternalEvent.DocumentsRemoveDocumentPhoto, {
            userIdentifier,
            documentType: DocumentType.InternalPassport,
            documentIdentifier: 'other-document-identifier',
        })
    })

    it('should return true if foreign passport document exists and handle photo', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()
        const passportEisSuccessResponse = getPassport()
        const {
            documents: [foreignPassport],
        } = passportEisSuccessResponse
        const {
            user: { itn, identifier: userIdentifier, lName, fName, mName, birthDay, gender },
        } = session
        const documentIdentifier = identifierService.createIdentifier(foreignPassport.number)

        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce({ ...passportEisSuccessResponse, documents: [foreignPassport] })
        jest.spyOn(moleculer, 'act').mockResolvedValueOnce({
            documents: [{ documentType: DocumentType.ForeignPassport, documentIdentifier: 'other-document-identifier' }],
        })

        // Act
        const result = await action.handler({ session, headers, params: { handlePhoto: true } })

        // Assert
        expect(result).toEqual({ exists: true })

        expect(external.receiveDirect).toHaveBeenCalledWith(
            ExternalEvent.RepoDocumentPassports,
            {
                addressInStructure: config.eis.addressInStructure,
                person: <Person>{ rnokpp: itn },
                representative: <Representative>{
                    firstname: fName,
                    lastname: lName,
                    middlename: mName,
                    rnokpp: itn,
                },
            },
            {},
        )
        expect(task?.publish).toHaveBeenCalledWith(ServiceTask.PublishAdultRegistrationAddressCommunity, <EventPayload>{
            userIdentifier,
            itn,
            lName,
            fName,
            mName,
            birthDay,
            gender,
            koatuu: '8000000000',
        })
        expect(moleculer.act).toHaveBeenCalledWith(
            'User',
            {
                name: 'checkDocumentsFeaturePoints',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier },
            },
        )
        expect(eventBus?.publish).toHaveBeenCalledWith(InternalEvent.DocumentsAddDocumentPhoto, {
            userIdentifier,
            documentType: DocumentType.ForeignPassport,
            documentIdentifier,
            photo: foreignPassport.photo,
        })
        expect(eventBus?.publish).toHaveBeenCalledWith(InternalEvent.DocumentsRemoveDocumentPhoto, {
            userIdentifier,
            documentType: DocumentType.ForeignPassport,
            documentIdentifier: 'other-document-identifier',
        })
    })
})
