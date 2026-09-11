import Constants from "expo-constants";

const repositoryUrl =
  typeof Constants.expoConfig?.extra?.repositoryUrl === "string"
    ? Constants.expoConfig.extra.repositoryUrl
    : null;

export const appMetadata = Object.freeze({
  repositoryUrl,
  version: Constants.expoConfig?.version ?? "1.0.0",
});
