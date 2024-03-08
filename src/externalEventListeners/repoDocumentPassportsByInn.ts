import { EventBusListener, ExternalEvent } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import { PassportsByInnResponse } from '@interfaces/externalEventListeners/repoDocumentPassportsByInn'

export default class RepoDocumentPassportsByInnEventListener implements EventBusListener {
    readonly event: ExternalEvent = ExternalEvent.RepoDocumentPassportsByInn

    readonly isSync: boolean = true

    readonly validationRules: ValidationSchema<PassportsByInnResponse> = {
        success: { type: 'number' },
        return: {
            type: 'object',
            props: {
                error: { type: 'string', optional: true },

                last_name: { type: 'string', optional: true },
                first_name: { type: 'string', optional: true },
                middle_name: { type: 'string', optional: true },
                unzr: { type: 'string', optional: true },
                rnokpp: { type: 'string', optional: true },
                gender: { type: 'string', optional: true },
                date_birth: { type: 'string', optional: true },
                birth_place: { type: 'string', optional: true },
                birth_country: { type: 'string', optional: true },
                birth_country_id: { type: 'string', optional: true },
                registration: {
                    type: 'object',
                    optional: true,
                    props: {
                        registration_inf: { type: 'boolean', convert: true },
                        postbox: { type: 'string', optional: true },
                        address_grom_katottg: { type: 'string', optional: true },
                        address_koatuu: { type: 'string', optional: true },
                        address_katottg: { type: 'string', optional: true },
                        region: { type: 'string', optional: true },
                        district: { type: 'string', optional: true },
                        settlement_name: { type: 'string', optional: true },
                        settlement_type: { type: 'string', optional: true },
                        city_district: { type: 'string', optional: true },
                        settlement_district_katottg: { type: 'string', optional: true },
                        street_name: { type: 'string', optional: true },
                        street_type: { type: 'string', optional: true },
                        building_number: { type: 'string', optional: true },
                        building_part: { type: 'string', optional: true },
                        apartment: { type: 'string', optional: true },
                        registration_date: { type: 'string', optional: true },
                        cancelregistration_date: { type: 'string', optional: true },
                    },
                },
                documents: {
                    type: 'object',
                    optional: true,
                    props: {
                        documents: { type: 'boolean', convert: true },
                        type: { type: 'string', optional: true },
                        documentSerial: { type: 'string', optional: true },
                        number: { type: 'string', optional: true },
                        date_issue: { type: 'string', optional: true },
                        date_expiry: { type: 'string', optional: true },
                        dep_issue: { type: 'string', optional: true },
                    },
                },
            },
        },
    }
}
