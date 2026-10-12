import {
  CalendarCheckIcon,
  CastleTurretIcon,
  ChartBarHorizontalIcon,
  ChartLineIcon,
  CheckSquareIcon,
  ClockCounterClockwiseIcon,
  CloudArrowUpIcon,
  CrosshairIcon,
  CubeIcon,
  DatabaseIcon,
  ConfettiIcon,
  HourglassIcon,
  ScalesIcon,
  GaugeIcon,
  GearIcon,
  GlobeHemisphereWestIcon,
  GraphIcon,
  HammerIcon,
  HeartIcon,
  HouseIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  ScrollIcon,
  ShieldCheckIcon,
  SkullIcon,
  SwordIcon,
  TimerIcon,
  TreeStructureIcon,
  TrophyIcon,
  UsersFourIcon,
  UsersIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { PaidTier } from "./entitlement";
import type { Key } from "./i18n";

// Sidebar of the prototype (renderVals → groups / navBottom). Page ids are the
// prototype's, so a page maps 1:1 to its `pg.<id>` block in the .dc.html.
// `release` is when the real feature ships (docs/ROADMAP.md).
// `tier`: minimum subscription to open the page (notes/patreon-tiers-plan.md); none = free forever.
// A Player (tier free) loses only Party, the Report's rotations and Gear Viewer once the
// 30-day trial ends; the paid plans are not out yet, so "recluta" just means "any plan".
export type NavPage = { id: string; label: Key; icon: Icon; release: string; tier?: PaidTier };
export type NavGroup = { label?: Key; icon?: Icon; items: NavPage[] };

const p = (id: string, label: Key, icon: Icon, release: string, tier?: PaidTier): NavPage => ({ id, label, icon, release, tier });

export const NAV: NavGroup[] = [
  { items: [p("home", "nav.home", HouseIcon, "R1")] },
  {
    label: "nav.combat",
    icon: CrosshairIcon,
    items: [
      p("meter", "nav.dpsMeter", GaugeIcon, "R1"),
      p("storico", "nav.fightHistory", ClockCounterClockwiseIcon, "R1"),
      p("report", "nav.report", ChartLineIcon, "R2"),
      p("logonline", "nav.onlineLogs", CloudArrowUpIcon, "R2"),
      p("classifiche", "nav.rankings", TrophyIcon, "R2"),
      p("classstats", "nav.classStats", ChartBarHorizontalIcon, "R2"),
    ],
  },
  {
    label: "nav.characters",
    icon: UsersThreeIcon,
    items: [
      p("personaggi", "nav.myCharacters", UsersThreeIcon, "R3"),
      p("builds", "nav.builds", UsersIcon, "R3"),
      p("party", "nav.party", UsersFourIcon, "R3", "recluta"),
      p("builder", "nav.builder", SwordIcon, "R3"),
      p("skillplan", "nav.skillPlanner", TreeStructureIcon, "R3"),
      p("daevanion", "nav.daevanion", GraphIcon, "R3"),
    ],
  },
  {
    label: "nav.database",
    icon: DatabaseIcon,
    items: [
      p("database", "nav.search", MagnifyingGlassIcon, "R3"),
      p("item", "nav.items", CubeIcon, "R3"),
      p("dbskill", "nav.skills", LightningIcon, "R3"),
      p("npc", "nav.npcs", SkullIcon, "R3"),
      p("quest", "nav.quests", ScrollIcon, "R3"),
      p("dungeon", "nav.dungeons", CastleTurretIcon, "R3"),
      p("gearviewer", "nav.gearViewer", ScalesIcon, "R3", "recluta"),
    ],
  },
  {
    label: "nav.world",
    icon: GlobeHemisphereWestIcon,
    items: [
      p("mappa", "nav.map", MapTrifoldIcon, "R4"),
      p("crafting", "nav.crafting", HammerIcon, "R4"),
    ],
  },
  {
    label: "nav.organizer",
    icon: CalendarCheckIcon,
    items: [
      p("attivita", "nav.tasks", CheckSquareIcon, "R5"),
      p("timer", "nav.timers", TimerIcon, "R5"),
      p("shugo", "nav.shugoFestival", ConfettiIcon, "R5"),
      p("rift", "nav.spacetimeRift", HourglassIcon, "R5"),
    ],
  },
];

export const NAV_BOTTOM: NavPage[] = [
  p("supporter", "nav.supporter", HeartIcon, "R6"),
  p("impostazioni", "nav.settings", GearIcon, "R1"),
];

/** Not a page: the Report's Rotation tab (report.tsx) locks with Party. */
export const ROTATION_TIER: PaidTier = "recluta";

export const ALL_PAGES = [...NAV.flatMap((g) => g.items), ...NAV_BOTTOM];

/** Admin panel: opened from Settings → Account, never in the sidebar or the palette. */
export const ADMIN_PAGE = p("admin", "nav.admin", ShieldCheckIcon, "R6");
