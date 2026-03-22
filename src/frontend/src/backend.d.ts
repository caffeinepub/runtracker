import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RunSession {
    id: string;
    durationSeconds: number;
    endTimestamp: bigint;
    startTimestamp: bigint;
    caloriesBurned: number;
    distanceMeters: number;
    route: Array<[number, number]>;
}
export interface backendInterface {
    getAllRunSessions(): Promise<Array<RunSession>>;
    getAllRunSessionsByEndTime(): Promise<Array<RunSession>>;
    getAllRunSessionsByStartTime(): Promise<Array<RunSession>>;
    getRunSession(id: string): Promise<RunSession | null>;
    saveRunSession(session: RunSession): Promise<void>;
}
