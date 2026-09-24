// The only public transport entry point for HB features and orchestration.
export { ipc } from './client'
export type { HbClient, Unsubscribe } from './client'
export type { CommandName, CommandArgs, CommandValue, EventName, EventPayload, InternalAction, TimerAudit } from './contracts'
export type { HbResult, HbError, HardwareInfo, MachineProfile, FitObject, DownloadState, TaskReceipt, CheckResult, LibraryRecord, Settings, CatalogFile, CatalogCache, Connectivity, StorageRoot, Thread, Message } from './schemas'
