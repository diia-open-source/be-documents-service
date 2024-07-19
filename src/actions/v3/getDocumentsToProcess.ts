import api from '@opentelemetry/api'

import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { InternalServerError } from '@diia-inhouse/errors'
import { ActionVersion, OnInit, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import { GetDocumentsToProcessResponse } from '@src/generated'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/getDocumentsToProcess'

export default class GetDocumentsToProcessAction implements GrpcAppAction, OnInit {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V3

    readonly name: string = 'getDocumentsToProcess'

    readonly documentTypes: string[] = []

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentTypes: {
            type: 'array',
            unique: true,
            items: {
                type: 'string',
                enum: this.documentTypes,
            },
        },
        ignoreCache: { type: 'boolean', optional: true },
    }

    onInit(): void {
        this.documentTypes.push(...Object.keys(this.documentsService.documentTypeToGrpcDocumentType))
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentTypes, ignoreCache = false },
            session: { user },
            headers,
        } = args

        const span = api.trace.getActiveSpan()

        span?.setAttributes({
            documentTypes: documentTypes,
        })

        const getDocumentsResult = await this.documentsService.getDocumentsToProcess(user, headers, documentTypes, {}, ignoreCache)

        const result: ActionResult = {}

        for (const [documentType, data] of Object.entries(getDocumentsResult)) {
            const grpcDocumentType = this.documentsService.documentTypeToGrpcDocumentType[documentType]

            this.assertsIsDocumentTypeCompatibleToGrpcDocumentType(grpcDocumentType)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[grpcDocumentType] = <any>data
        }

        return result
    }

    assertsIsDocumentTypeCompatibleToGrpcDocumentType(
        documentType: string | undefined,
    ): asserts documentType is keyof GetDocumentsToProcessResponse {
        if (!documentType) {
            throw new InternalServerError(`Unsupported document type: ${documentType}`)
        }
    }
}
