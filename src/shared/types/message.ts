import type { BlockProfile, GlobalSettings } from "./profile";
import type { MatchReason } from "./match";
import type { PlatformKey } from "@/content/platforms/registry";

export const MSG = {
  PROFILES_UPDATED: "socialshield/profiles_updated",
  SETTINGS_UPDATED: "socialshield/settings_updated",
  GET_STATE: "socialshield/get_state",
  RECORD_MATCH: "socialshield/record_match",
  PING: "socialshield/ping",
} as const;

export type MessageType = (typeof MSG)[keyof typeof MSG];

export interface ProfilesUpdatedMsg {
  type: typeof MSG.PROFILES_UPDATED;
  profiles: BlockProfile[];
}

export interface SettingsUpdatedMsg {
  type: typeof MSG.SETTINGS_UPDATED;
  settings: GlobalSettings;
}

export interface GetStateMsg {
  type: typeof MSG.GET_STATE;
}

export interface GetStateReply {
  profiles: BlockProfile[];
  settings: GlobalSettings;
}

export interface RecordMatchMsg {
  type: typeof MSG.RECORD_MATCH;
  profileId: string;
  profileName: string;
  reason: MatchReason;
  platform: PlatformKey;
}

export type ExtMessage =
  | ProfilesUpdatedMsg
  | SettingsUpdatedMsg
  | GetStateMsg
  | RecordMatchMsg
  | { type: typeof MSG.PING };
