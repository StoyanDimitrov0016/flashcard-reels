import { getDefaultConfig } from "expo/metro-config.js";

const config = getDefaultConfig(import.meta.dirname);

config.resolver.sourceExts.push("sql");
config.resolver.assetExts.push("wasm", "fcrdeck");

export default config;
