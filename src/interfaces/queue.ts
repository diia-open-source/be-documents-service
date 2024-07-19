export enum InternalQueueName {
    QueueDocuments = 'QueueDocuments',
}

export enum ScheduledTaskQueueName {
    ScheduledTasksQueueDocuments = 'ScheduledTasksQueueDocuments',
}

export enum InternalEvent {
    AuthUserLogOut = 'auth-user-log-out',
    DocumentsAddDocumentsInProfile = 'documents-add-documents-in-profile',
    DocumentsAddDocumentInProfile = 'documents-add-document-in-profile',
    DocumentsAddDocumentPhoto = 'documents-add-document-photo',
    DocumentsRemoveDocumentPhoto = 'documents-remove-document-photo',
    DocumentsAdultRegistrationAddressCommunity = 'documents-adult-registration-address-community',
}

export enum ExternalEvent {
    RepoDocumentInternalPassport = 'document.internal-passport',
    RepoDocumentForeignPassport = 'document.foreign-passport',
    RepoDocumentPassports = 'document.passports',
    RepoDocumentPassportsByInn = 'document.passports_by_inn',
}

export enum InternalTopic {
    TopicAuthUserSession = 'TopicAuthUserSession',
    TopicScheduledTasks = 'TopicScheduledTasks',
    TopicDocumentsRegistry = 'TopicDocumentsRegistry',
}

export enum ExternalTopic {
    Repo = 'Repo',
}

export enum ScheduledTaskEvent {
    DocumentsArchiveUsedOtp = 'documents-archive-used-otp',
    DocumentsDeleteUnusedOtp = 'documents-delete-unused-otp',
}
