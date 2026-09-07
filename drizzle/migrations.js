// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from "./meta/_journal.json";
import m0000 from "./0000_spooky_magneto.sql";
import m0001 from "./0001_chief_thunderball.sql";
import m0002 from "./0002_clean_dark_phoenix.sql";
import m0003 from "./0003_yellow_lizard.sql";
import m0004 from "./0004_stiff_the_watchers.sql";
import m0005 from "./0005_married_imperial_guard.sql";
import m0006 from "./0006_dear_nitro.sql";
import m0007 from "./0007_careful_cardiac.sql";
import m0008 from "./0008_next_zarek.sql";
import m0009 from "./0009_nostalgic_lady_mastermind.sql";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
    m0008,
    m0009,
  },
};
