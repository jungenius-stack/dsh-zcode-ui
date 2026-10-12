/**
 * ZCode 图标语言：全站 Lucide（与 zai-org/ZCode 一致），导航/操作图标 16px（DESIGN.md size-4）。
 * 这里只包一层与 host-icons 相同的 { size } 调用约定，供侧栏与外壳使用；
 * 会话树、频道、定时等数据密集区继续用宿主图标，保持与宿主主题联动。
 */
import {
  Bot, CalendarClock, ChevronRight, Link2, MessageCircle, MessageCirclePlus,
  MoreHorizontal, PanelLeft, PanelLeftOpen, Puzzle, Search, Sparkles, Store, Users,
  type LucideIcon,
} from 'lucide-react'

export type ZCodeIcon = LucideIcon

/** 新建任务：ZCode NewTaskButtonGroup 同款 MessageCirclePlus。 */
export const ZIconNewTask = MessageCirclePlus
/** 全局搜索：ZCode 侧栏搜索行同款 Search。 */
export const ZIconSearch = Search
/** 折叠侧栏 / 展开侧栏：ZCode 折叠轨同款 PanelLeft(PanelLeftOpen)。 */
export const ZIconCollapse = PanelLeft
export const ZIconExpand = PanelLeftOpen
/** 扩展分组：Puzzle。 */
export const ZIconExtensions = Puzzle
export const ZIconChevronRight = ChevronRight
/** 设置分区导航。 */
export const ZIconExperts = Users
export const ZIconSkills = Sparkles
export const ZIconPlugins = Store
export const ZIconConnectors = Link2
export const ZIconSchedule = CalendarClock
/** IM 助理。 */
export const ZIconAssistant = Bot
export const ZIconChannels = MessageCircle
/** 行内更多操作。 */
export const ZIconMore = MoreHorizontal
