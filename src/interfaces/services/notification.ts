import { ObjectId } from 'mongodb'

export enum TemplateStub {
    ApplicationId = 'APPLICATION_ID',
    ServiceCenterName = 'SERVICE_CENTER_NAME',
    Reason = 'REASON',
    Address = 'ADDRESS',
    PhoneNumber = 'PHONE_NUMBER',
    FullName = 'FULL_NAME',
    Owner = 'OWNER',
    OrderNum = 'ORDER_NUM',
    DateFrom = 'DATE_FROM',
    Specializations = 'SPECIALIZATIONS',
}

export type TemplateParams = Partial<Record<TemplateStub, string>>

export interface GetNotificationByResourceTypeResult {
    _id: ObjectId
    hashId: string
    userIdentifier: string
    resourceId?: string
    resourceType?: string
    isRead: boolean
    isDeleted: boolean
}

export interface CreateNotificationWithPushesByMobileUidParams {
    templateCode: string
    userIdentifier: string
    templateParams?: TemplateParams
    resourceId?: string
    mobileUid: string
}
