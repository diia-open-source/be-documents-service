import { MoleculerService } from '@diia-inhouse/diia-app'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator, ExternalEvent, InternalEvent, Task } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { ActionVersion, DocStatus, DocumentType } from '@diia-inhouse/types'

import GetPassportToProcessAction from '@src/actions/v1/getPassportToProcess'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { AppConfig } from '@interfaces/config'
import { PassportType } from '@interfaces/dto'
import { Passport, Person, Representative } from '@interfaces/providers/eis'
import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/publishAdultRegistrationAddressCommunity'

describe(`Action GetPassportToProcessAction`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetPassportToProcessAction
    let external: ExternalCommunicator
    let moleculer: MoleculerService
    let eventBus: EventBus
    let task: Task
    let config: AppConfig
    let identifierService: IdentifierService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetPassportToProcessAction)
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

    it('should return internal passport document and handle photo', async () => {
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
        expect(result).toEqual<Passport>({
            id: '20000213-01467-2016-03-09',
            docNumber: idCard.number,
            number: idCard.number,
            genderUA: 'Ж',
            genderEN: 'F',
            nationalityUA: 'Україна',
            nationalityEN: 'Ukraine',
            lastNameUA: 'Дія',
            lastNameEN: 'Diia',
            firstNameUA: 'Надія',
            firstNameEN: 'Nadiia',
            middleNameUA: 'Володимирівна',
            birthday: '13.02.2000',
            birthPlaceUA: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА',
            birthPlaceEN: 'M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
            issueDate: '09.03.2016',
            expirationDate: '09.03.2026',
            recordNumber: '20000213-01467',
            photo: idCard.photo,
            sign: idCard.signature,
            type: PassportType.ID,
            documentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 20.07.1969',
            currentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 20.07.1969',
            docStatus: DocStatus.Ok,
            department: idCard.dep_issue,
            fullNameHash:
                'c06d8847c06805ecd8ce76d02a2c1fe5dd5ae23d9d53ef89832fee3fb0ef6903761a994722701ae72870292f146812d5d4b9802c91abec7beca90771ad6e6f8d',
        })

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

    it('should return foreign passport document and handle photo', async () => {
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
        expect(result).toEqual({
            docStatus: DocStatus.Ok,
            docNumber: 'FC449752',
            series: 'FC',
            number: '449752',
            id: '20000213-01467-2016-05-12',
            lastNameUA: 'Дія',
            firstNameUA: 'Надія',
            middleNameUA: '',
            lastNameEN: 'Diia',
            firstNameEN: 'Nadiia',
            fullNameHash:
                'dc2d579e6ceb4588cf145bf304d8a81e1df158f5f2f3943c1015ae0e6a30f0998a7e6597ee97738a63ab39cc39c1f1ac0dd192d5eae2e40d79a4c6a35f61f792',
            genderUA: 'Ж',
            genderEN: 'F',
            nationalityUA: 'Україна',
            nationalityEN: 'Ukraine',
            photo: foreignPassport.photo,
            birthday: '13.02.2000',
            sign: foreignPassport.signature,
            birthPlaceUA: 'ДОНЕЦЬКА ОБЛ.',
            birthPlaceEN: 'UKR',
            issueDate: '12.05.2016',
            expirationDate: '12.05.2026',
            recordNumber: '20000213-01467',
            type: PassportType.P,
            documentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 20.07.1969',
            currentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 20.07.1969',
            departmentUA: '1455',
            departmentEN: '1455',
            typeUA: PassportType.P,
            typeEN: PassportType.P,
            countryCode: 'UKR',
            tickerOptions: {
                type: 'info',
                text: 'Паспорт в Дії дійсний лише в Україні',
            },
            ua: {
                card: {
                    name: 'Закордонний\nпаспорт',
                    icon: '|_|_|',
                    lastName: 'Дія',
                    firstName: 'Надія',
                    middleName: '',
                    birthDate: {
                        name: 'Дата\nнародження',
                        value: '13.02.2000',
                    },
                    docNumber: {
                        name: 'Номер',
                        value: 'FC449752',
                    },
                },
                name: 'Закордонний паспорт',
                icon: '|_|_|',
                country: 'Україна',
                docNumber: {
                    name: 'Номер',
                    value: 'FC449752',
                },
                lastName: 'Дія',
                firstName: 'Надія ',
                gender: {
                    name: 'Стать',
                    value: 'Ж',
                },
                birthDate: {
                    name: 'Дата народження',
                    value: '13.02.2000',
                },
                nationality: {
                    name: 'Громадянство',
                    value: 'Україна',
                },
                department: {
                    name: 'Орган, що видав',
                    value: '1455',
                },
                issueDate: {
                    name: 'Дата видачі',
                    value: '12.05.2016',
                },
                expiryDate: {
                    name: 'Дійсний до',
                    value: '12.05.2026',
                },
                identifier: {
                    name: 'Запис № (УНЗР)',
                    value: '20000213-01467',
                },
                type: {
                    name: 'Тип',
                    value: 'P',
                },
                countryCode: {
                    name: 'Код держави',
                    value: 'UKR',
                },
                birthPlace: {
                    name: 'Місце народження',
                    value: 'ДОНЕЦЬКА ОБЛ.',
                },
                residenceRegistrationPlace: {
                    name: 'Місце реєстрації проживання',
                    value: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                },
                registrationDate: {
                    name: 'Дата реєстрації',
                    value: '20.07.1969',
                },
            },
            eng: {
                card: {
                    name: 'International\nPassport',
                    icon: '|_|_|',
                    lastName: 'Diia',
                    firstName: 'Nadiia',
                    birthDate: {
                        name: 'Date of birth',
                        value: '13.02.2000',
                    },
                    docNumber: {
                        name: 'Document\nnumber',
                        value: 'FC449752',
                    },
                },
                name: 'International Passport',
                icon: '|_|_|',
                country: 'Ukraine',
                docNumber: {
                    name: 'Document number',
                    value: 'FC449752',
                },
                lastName: 'Diia',
                firstName: 'Nadiia',
                gender: {
                    name: 'Sex:',
                    value: 'F',
                },
                birthDate: {
                    name: 'Date of birth:',
                    value: '13.02.2000',
                },
                nationality: {
                    name: 'Nationality:',
                    value: 'Ukraine',
                },
                department: {
                    name: 'Authority:',
                    value: '1455',
                },
                issueDate: {
                    name: 'Date of issue:',
                    value: '12.05.2016',
                },
                expiryDate: {
                    name: 'Date of expiry:',
                    value: '12.05.2026',
                },
                identifier: {
                    name: 'Record No.:',
                    value: '20000213-01467',
                },
                type: {
                    name: 'Type:',
                    value: 'P',
                },
                countryCode: {
                    name: 'Country code:',
                    value: 'UKR',
                },
                birthPlace: {
                    name: 'Place of birth:',
                    value: 'UKR',
                },
                residenceRegistrationPlace: {
                    name: 'Legal address:',
                    value: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                },
                registrationDate: {
                    name: 'Registered on:',
                    value: '20.07.1969',
                },
            },
        })

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
