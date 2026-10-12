/**
 * ZCode 图标语言：全站 Lucide（与 zai-org/ZCode 一致），导航/操作图标 16px（DESIGN.md size-4）。
 * 这里只包一层与 host-icons 相同的 { size } 调用约定，供侧栏与外壳使用。
 *
 * 本模块是**插件界面图标的唯一来源**：侧栏外壳、会话树、列表行、行内操作、
 * 悬停卡一律从这里取图标。ZCode 全站使用 Lucide，混入宿主图标会让同一屏内
 * 出现两套图标语言（stroke 几何与视觉重量都不同），故不保留宿主图标路径。
 */
import {
  Archive, ArrowLeft, Bot, Box, Bug, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock, Copy, Cpu, Download, Eye, EyeOff, Folder, FolderOpen, FolderPlus, GitBranch,
  Hammer, Link2, LoaderCircle, MessageCircle, MessageCirclePlus, MessageSquare, MoreHorizontal,
  PanelLeft, PanelLeftOpen, PanelRight, Pencil, Pin, Puzzle, ScanLine, Search, Settings,
  SlidersHorizontal, Sparkles, SquarePen, Store, Telescope, Trash2, User, Users,
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
/** 全局面板打开时的「返回会话」入口（ZCode 侧栏没有上游那个「任务」导航项，需要显式返回）。 */
export const ZIconBack = ChevronLeft
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

/* ── 会话树 / 列表行 / 行内操作 ─────────────────────────────────────────────
 * 这些原先取自宿主图标（host-icons.ts 的 IconXxxMedium）。ZCode 全站 Lucide，
 * 混用会让同一屏出现两套图标语言（stroke 几何与视觉重量都不同），故统一收归此处。
 */

/** 项目 / 分组文件夹（闭合态）。 */
export const ZIconFolder = Folder
/** 项目 / 分组文件夹（展开态）。 */
export const ZIconFolderOpen = FolderOpen
/** 新建项目 / 加入分组。 */
export const ZIconProjectAdd = FolderPlus
/** 归档会话。 */
export const ZIconArchive = Archive
/** 重命名。 */
export const ZIconRename = Pencil
/** 复制。 */
export const ZIconCopy = Copy
/** 删除。 */
export const ZIconDelete = Trash2
/** 导出 / 下载。 */
export const ZIconDownload = Download
/** 勾选态。 */
export const ZIconCheck = Check
/** 加载态。 */
export const ZIconLoading = LoaderCircle
/** 分支 / 派生会话。 */
export const ZIconBranch = GitBranch
/** 会话链接。 */
export const ZIconLink = Link2
/** 列表行内编辑。 */
export const ZIconListPen = SquarePen
/** 下拉箭头。 */
export const ZIconChevronDown = ChevronDown
/** 设置。 */
export const ZIconSettings = Settings
/** 个性化。 */
export const ZIconPersonalization = SlidersHorizontal
/** 账号。 */
export const ZIconUser = User
/** 置顶。 */
export const ZIconPin = Pin
/** 已隐藏 / 显示切换。 */
export const ZIconEye = Eye
export const ZIconEyeOff = EyeOff

/**
 * 设置页与面板页使用的补充图标。
 * 这些页面此前直接从 `lucide-react` 取图标，绕过了本入口——同一份图标语言却有两个来源，
 * 改名或换库时要改多处。现统一从这里导出，仍是 Lucide，视觉不变。
 */
export const ZIconArrowLeft = ArrowLeft
export const ZIconBox = Box
export const ZIconHelp = CircleHelp
export const ZIconClock = Clock
export const ZIconCpu = Cpu
export const ZIconMessageSquare = MessageSquare
// 连接器：复用上方既有的 ZIconLink（=Link2），与侧栏连接器入口保持同一图标，不再单独导出 Link。
export const ZIconPanelRight = PanelRight
export const ZIconTelescope = Telescope
export const ZIconHammer = Hammer
export const ZIconScanLine = ScanLine
export const ZIconBug = Bug
