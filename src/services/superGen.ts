import { MoleculerService } from '@diia-inhouse/diia-app'

import { InternalServerError } from '@diia-inhouse/errors'
import { ActionVersion, GenericData, GenericObject, Logger } from '@diia-inhouse/types'

import { GenerationResult } from '@interfaces/services/superGen'

export default class SuperGenService {
    private readonly serviceName = 'SuperGen'

    constructor(
        private readonly moleculer: MoleculerService,
        private readonly logger: Logger,
    ) {}

    async generatePdf(params: GenericObject, name: string, actionVersion = ActionVersion.V1): Promise<string> {
        const result: GenerationResult = await this.moleculer.act(
            this.serviceName,
            {
                name,
                actionVersion,
            },
            {
                params,
            },
        )

        return result.file
    }

    async generateGenericPdf(data: GenericData): Promise<string> {
        try {
            const { file }: GenerationResult = await this.moleculer.act(
                this.serviceName,
                { name: 'generateGenericPdfDocument', actionVersion: ActionVersion.V1 },
                { params: { data } },
            )

            return file
        } catch (err) {
            const errMsg = `Error occurred while generating generic pdf document`

            this.logger.fatal(errMsg, { err })

            throw new InternalServerError(errMsg)
        }
    }
}
