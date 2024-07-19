import { GenericData, RowType } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import { DriverLicense } from '@src/documents/driverLicense/interfaces/services'

export default class DriverLicensePdfDataMapper {
    toSharingPdf(document: DriverLicense, requester: string, requestDateTime: string, requestIdentifier: string): GenericData {
        const { lastNameEN, firstNameEN, lastNameUA, firstNameUA, middleNameUA, docNumber, photo, eng, ua } = document

        return {
            documentTitle: 'Driver License',
            blocks: [
                {
                    logoBlock: {
                        header: 'Driving Licence',
                        title: 'Посвідчення водія',
                        subtitle: 'Ukraine • Україна',
                    },
                    marginBottom: 16,
                },
                { hasSeparator: true, marginBottom: 24 },
                {
                    identityBlock: {
                        lastName: lastNameEN,
                        firstName: firstNameEN,
                        fullName: utils.getFullName(lastNameUA, firstNameUA, middleNameUA),
                        documentNumber: docNumber,
                        photo,
                    },
                    marginBottom: 0,
                },
                { hasSeparator: true, marginBottom: 16 },
                {
                    textBlock: [
                        `The digital document copy requested on ${requestDateTime}`,
                        `Request initiator: ${requester}`,
                        `Request ID: ${requestIdentifier}`,
                    ],
                },
                {
                    tableBlock: [
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.lastName?.code },
                            { primaryText: eng?.lastName?.name, secondaryText: ua?.lastName?.name },
                            { primaryText: eng?.lastName?.value, secondaryText: ua?.lastName?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.firstName?.code },
                            { primaryText: eng?.firstName?.name, secondaryText: ua?.firstName?.name },
                            { primaryText: eng?.firstName?.value, secondaryText: ua?.firstName?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.birth?.code },
                            { primaryText: eng?.birth?.name, secondaryText: ua?.birth?.name },
                            { primaryText: eng?.birth?.value?.split('\n')?.[0], secondaryText: ua?.birth?.value?.split('\n')?.[1] },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.issueDate?.code },
                            { primaryText: eng?.issueDate?.name, secondaryText: ua?.issueDate?.name },
                            { primaryText: eng?.issueDate?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.expiryDate?.code },
                            { primaryText: eng?.expiryDate?.name, secondaryText: ua?.expiryDate?.name },
                            { primaryText: eng?.expiryDate?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.department?.code },
                            { primaryText: eng?.department?.name, secondaryText: ua?.department?.name },
                            { primaryText: eng?.department?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.identifier?.code },
                            { primaryText: eng?.identifier?.name, secondaryText: ua?.identifier?.name },
                            { primaryText: eng?.identifier?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.documentNumber?.code },
                            { primaryText: eng?.documentNumber?.name, secondaryText: ua?.documentNumber?.name },
                            { primaryText: eng?.documentNumber?.value },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.category?.code },
                            { primaryText: eng?.category?.name, secondaryText: ua?.category?.name },
                            { primaryText: eng?.category?.value?.split('\n') },
                        ],
                        [
                            RowType.ThreeColumns,
                            { primaryText: eng?.categoryOpeningDate?.code },
                            { primaryText: eng?.categoryOpeningDate?.name, secondaryText: ua?.categoryOpeningDate?.name },
                            { primaryText: eng?.categoryOpeningDate?.value?.split('\n') },
                        ],
                    ],
                },
            ],
        }
    }
}
